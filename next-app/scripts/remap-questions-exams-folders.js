const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('Checking Env Vars:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'FOUND' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'MISSING');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log('Starting re-mapping process...');

    const csvPath = path.join(__dirname, 'final_exam_report.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        process.exit(1);
    }

    // Helper to fetch all rows
    const fetchAll = async (table, select = 'id, testpress_id') => {
        let allData = [];
        let from = 0;
        const step = 1000;
        while (true) {
            const { data, error } = await supabase
                .from(table)
                .select(select)
                .range(from, from + step - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allData = allData.concat(data);
            if (data.length < step) break;
            from += step;
        }
        return allData;
    };

    // 1. Fetch lookups
    console.log('Fetching lookups (all)...');

    const questions = await fetchAll('questions');
    const questionMap = new Map(questions.map(q => [String(q.testpress_id), q.id]));
    console.log(`Loaded ${questionMap.size} questions.`);

    const exams = await fetchAll('exams');
    const examMap = new Map(exams.map(e => [String(e.testpress_id), e.id]));
    console.log(`Loaded ${examMap.size} exams.`);

    const folders = await fetchAll('question_folders');
    const folderMap = new Map(folders.map(f => [String(f.testpress_id), f.id]));
    console.log(`Loaded ${folderMap.size} folders.`);

    // 2. Clear existing mappings
    console.log('Clearing existing mappings...');

    // Assuming question_id is an integer (based on previous error).
    const { error: delEqError } = await supabase.from('exam_questions').delete().gt('question_id', 0);
    if (delEqError) console.error('Error clearing exam_questions:', delEqError.message);

    const { error: delQfError } = await supabase.from('question_folder_items').delete().gt('question_id', 0);
    if (delQfError) console.error('Error clearing question_folder_items:', delQfError.message);

    console.log('Tables cleared.');

    // 3. Process CSV
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split(/\r?\n/);

    const examQuestionsToInsert = [];
    const folderItemsToInsert = [];
    const questionsToUpdate = [];

    let processedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Regex to split by comma but ignore commas inside quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ''));

        if (cols.length < 7) continue;

        const qIdTP = cols[1]; // question-id
        const setCol = cols[2]; // set -> Folders
        const examCol = cols[3]; // exam -> Exams
        // const sectionCol = cols[4]; // IGNORED
        const pctCol = cols[6]; // percentage correct

        const qId = questionMap.get(qIdTP);
        if (!qId) {
            continue;
        }

        // A. Update Percentage
        if (pctCol && pctCol !== 'NA') {
            const pctVal = parseFloat(pctCol.replace('%', ''));
            if (!isNaN(pctVal)) {
                questionsToUpdate.push({ id: qId, percentage_correct: pctVal });
            }
        }

        // B. Map Exams
        if (examCol && examCol !== 'NA') {
            const rawExams = examCol.split(',').map(s => s.trim());
            for (const eTP of rawExams) {
                const examId = examMap.get(eTP);
                if (examId) {
                    examQuestionsToInsert.push({
                        exam_id: examId,
                        question_id: qId
                    });
                }
            }
        }

        // C. Map Folders (from SET col)
        if (setCol && setCol !== 'NA') {
            const rawSets = setCol.split(',').map(s => s.trim());
            for (const fTP of rawSets) {
                const folderId = folderMap.get(fTP);
                if (folderId) {
                    folderItemsToInsert.push({
                        folder_id: folderId,
                        question_id: qId
                    });
                }
            }
        }

        processedCount++;
    }

    console.log(`Processed ${processedCount} CSV rows.`);
    console.log(`Updating ${questionsToUpdate.length} questions (percentage)...`);
    console.log(`Inserting ${examQuestionsToInsert.length} exam links...`);
    console.log(`Inserting ${folderItemsToInsert.length} folder links...`);

    // 4. Execute Updates and Inserts

    // Update Questions (Iterative)
    console.log('Updating questions...');
    let successCount = 0;
    let failCount = 0;

    // Process in parallel chunks of 20 to speed up
    const CHUNK_SIZE = 20;
    for (let i = 0; i < questionsToUpdate.length; i += CHUNK_SIZE) {
        const chunk = questionsToUpdate.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (q) => {
            const { error } = await supabase
                .from('questions')
                .update({ percentage_correct: q.percentage_correct })
                .eq('id', q.id);

            if (error) {
                console.error(`Failed update qID ${q.id}:`, error.message);
                failCount++;
            } else {
                successCount++;
            }
        }));
        if ((i + CHUNK_SIZE) % 200 === 0) console.log(`Progress: ${i + CHUNK_SIZE}/${questionsToUpdate.length}`);
    }
    console.log(`Questions updated: ${successCount}, Failed: ${failCount}`);

    // Insert Links
    const BATCH_SIZE = 1000;
    for (let i = 0; i < examQuestionsToInsert.length; i += BATCH_SIZE) {
        const batch = examQuestionsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('exam_questions').insert(batch);
        if (error) console.error(`Error inserting exam_questions batch ${i}:`, error.message);
        else console.log(`Inserted exam_questions batch ${i}-${i + batch.length}`);
    }

    for (let i = 0; i < folderItemsToInsert.length; i += BATCH_SIZE) {
        const batch = folderItemsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('question_folder_items').insert(batch);
        if (error) console.error(`Error inserting question_folder_items batch ${i}:`, error.message);
        else console.log(`Inserted question_folder_items batch ${i}-${i + batch.length}`);
    }

    console.log('Remap complete!');
}

main().catch(e => console.error(e));
