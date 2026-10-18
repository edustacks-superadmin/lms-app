
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize text for comparison
function normalizeText(html) {
    if (!html) return '';
    try {
        const $ = cheerio.load(html);
        let text = $.text();
        return text.replace(/\s+/g, ' ').trim();
    } catch (e) {
        return String(html).trim();
    }
}

// Global Maps
const dbSubjectsMap = new Map();
const dbExamsMap = new Map();
const dbFoldersMap = new Map();

async function fetchAllSubjects() {
    console.log('Fetching subjects...');
    const { data, error } = await supabase.from('subjects').select('id, name, parent_id');
    if (error) {
        console.error('Error fetching subjects:', error);
        return;
    }
    data.forEach(s => {
        dbSubjectsMap.set(s.name.trim(), s);
    });
    console.log(`Loaded ${dbSubjectsMap.size} subjects.`);
}

async function fetchAllExams() {
    console.log('Fetching exams...');
    const { data, error } = await supabase.from('exams').select('id, title');
    if (error) {
        console.error('Error fetching exams:', error);
        return;
    }
    data.forEach(e => {
        dbExamsMap.set(e.title.trim(), e);
    });
    console.log(`Loaded ${dbExamsMap.size} exams.`);
}

async function fetchAllFolders() {
    console.log('Fetching folders...');
    // We only need id and name
    // Note: Use pagination if too many folders, but for 2k folders, one request is fine (default limit 1000).
    // Supabase default max rows is 1000. We need to handle pagination if > 1000.
    // Let's assume < 10000 and do a loop or large range.
    let allFolders = [];
    let rangeStart = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data, error } = await supabase.from('question_folders').select('id, name').range(rangeStart, rangeStart + PAGE_SIZE - 1);
        if (error) {
            console.error('Error fetching folders:', error);
            break;
        }
        if (data.length === 0) break;
        allFolders = allFolders.concat(data);
        if (data.length < PAGE_SIZE) break;
        rangeStart += PAGE_SIZE;
    }

    allFolders.forEach(f => {
        dbFoldersMap.set(f.name.trim(), f);
    });
    console.log(`Loaded ${dbFoldersMap.size} folders.`);
}

async function getOrCreateSubject(subName, parentName = null) {
    if (!subName) return null;
    subName = subName.trim();

    // Resolve Parent
    let parentId = null;
    if (parentName) {
        parentName = parentName.trim();
        let parentObj = dbSubjectsMap.get(parentName);
        if (!parentObj) {
            const { data, error } = await supabase
                .from('subjects')
                .insert({ name: parentName, parent_id: null })
                .select()
                .single();
            if (!error && data) {
                parentId = data.id;
                dbSubjectsMap.set(parentName, data);
            } else if (error) {
                // Try fetching again (race condition)
                const { data: existing } = await supabase.from('subjects').select('id').eq('name', parentName).single();
                if (existing) parentId = existing.id;
            }
        } else {
            parentId = parentObj.id;
        }
    }

    let subjectObj = dbSubjectsMap.get(subName);
    if (!subjectObj) {
        const { data, error } = await supabase
            .from('subjects')
            .insert({ name: subName, parent_id: parentId })
            .select()
            .single();
        if (!error && data) {
            dbSubjectsMap.set(subName, data);
            return data.id;
        } else if (error) {
            const { data: existing } = await supabase.from('subjects').select('id').eq('name', subName).single();
            if (existing) return existing.id;
        }
    }
    return subjectObj ? subjectObj.id : null;
}

// Map correct answer letter to index (0-based)
function getCorrectOptionIndex(letter) {
    if (!letter) return -1;
    letter = letter.trim().toLowerCase();
    const map = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };
    return map[letter] !== undefined ? map[letter] : -1;
}

async function main() {
    const excelPath = path.join(process.cwd(), 'testpress_data.xlsx');
    if (!fs.existsSync(excelPath)) {
        console.error('Error: file not found.');
        return;
    }

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read as Array of Arrays to handle dynamic options
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows in Excel: ${rows.length}`);

    await fetchAllSubjects();
    await fetchAllExams();
    await fetchAllFolders();

    // Column Indices (based on header inspection)
    const C_ID = 0;
    const C_EXAMS = 2;
    const C_SUBJECT = 5;
    const C_TOPIC = 6;
    const C_QUESTION = 8;
    const C_CORRECT_ANS = 9;
    const C_EXPLANATION = 10;
    const C_OPTIONS_START = 13;

    // FULL IMPORT MODE
    console.log(`\n--- STARTING FULL IMPORT ---`);
    const limit = rows.length;

    let insertedCount = 0;

    // Start from 1 to skip header
    for (let i = 1; i < limit; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const tpId = row[C_ID];
        const rawQuestion = row[C_QUESTION];
        if (!rawQuestion) continue;

        const subjectName = row[C_SUBJECT];
        const topicName = row[C_TOPIC];
        const examsStr = row[C_EXAMS];
        const correctAnswerLetter = row[C_CORRECT_ANS];
        const explanation = row[C_EXPLANATION];

        // 1. Get Subject
        const subjectId = await getOrCreateSubject(subjectName, topicName);

        // 2. Insert Question
        // Check duplication by testpress_id
        const { data: existingQ } = await supabase.from('questions').select('id').eq('testpress_id', tpId).single();

        let questionId;

        if (existingQ) {
            // Update?
            // console.log(`Question ${tpId} exists. Updating...`);
            await supabase.from('questions').update({
                question_text: rawQuestion,
                subject_id: subjectId,
                explanation: explanation
            }).eq('id', existingQ.id);
            questionId = existingQ.id;
        } else {
            // Insert
            const { data: newQ, error: insertError } = await supabase.from('questions').insert({
                testpress_id: tpId,
                question_text: rawQuestion,
                subject_id: subjectId,
                explanation: explanation,
                created_at: new Date()
            }).select('id').single();

            if (insertError) {
                console.error(`Error inserting Q ${tpId}:`, insertError.message);
                continue;
            }
            questionId = newQ.id;
        }

        // 3. Handle Options
        // Delete existing options first (if update)
        if (existingQ) {
            await supabase.from('question_options').delete().eq('question_id', questionId);
        }

        const correctIdx = getCorrectOptionIndex(correctAnswerLetter);

        const optionInserts = [];
        let optionIdx = 0;
        // Scan columns starting from 13
        for (let c = C_OPTIONS_START; c < row.length; c++) {
            const optText = row[c];
            if (optText) { // Assuming non-empty means option exists
                optionInserts.push({
                    question_id: questionId,
                    option_text: optText,
                    option_label: String.fromCharCode(97 + optionIdx), // a, b, c...
                    is_correct: (optionIdx === correctIdx),
                    option_order: optionIdx + 1
                });
                optionIdx++;
            }
        }

        if (optionInserts.length > 0) {
            const { error: optError } = await supabase.from('question_options').insert(optionInserts);
            if (optError) console.error(`Error inserting options for Q ${tpId}:`, optError.message);
        }

        // 4. Link Exams AND Folders
        if (examsStr) {
            // examsStr can be a number or string. Cast to string.
            const names = String(examsStr).split(',').map(s => s.trim()).filter(s => s);

            for (const name of names) {
                // Check Exams
                const examObj = dbExamsMap.get(name);
                if (examObj) {
                    const { data: link } = await supabase.from('exam_questions').select('id').eq('exam_id', examObj.id).eq('question_id', questionId).single();
                    if (!link) {
                        await supabase.from('exam_questions').insert({
                            exam_id: examObj.id,
                            question_id: questionId
                        });
                    }
                }

                // Check Folders
                const folderObj = dbFoldersMap.get(name);
                if (folderObj) {
                    // Check Link
                    // question_id is Int now (after schema fix), folder_id is UUID
                    const { data: link } = await supabase.from('question_folder_items')
                        .select('id')
                        .eq('folder_id', folderObj.id)
                        .eq('question_id', questionId) // Int
                        .single();

                    if (!link) {
                        const { error: folderErr } = await supabase.from('question_folder_items').insert({
                            folder_id: folderObj.id,
                            question_id: questionId // Int
                        });
                        if (folderErr) console.error(`Failed to link Q ${tpId} to Folder ${name}:`, folderErr.message);
                    }
                }
            }
        }

        insertedCount++;
        process.stdout.write(`\rProcessed ${i}/${limit - 1} rows...`);
    }

    console.log(`\nBatch Complete. Inserted/Updated: ${insertedCount} questions.`);
}

main().catch(console.error);
