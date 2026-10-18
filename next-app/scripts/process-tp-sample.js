const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample Data from User
const SAMPLE_DATA = [
    {
        "Question Id": 1,
        "Exams": "Shear in beams (RCC), Shear in beams (RCC), Shear in beams (RCC)",
        "Subject": "Earthquake Resistant Buildings",
        "Topic": "Civil"
    },
    {
        "Question Id": 2,
        "Exams": "",
        "Subject": "RCC",
        "Topic": "Civil"
    }
];

async function processRow(row) {
    const qId = row["Question Id"];
    const subjectName = row["Subject"]; // e.g., "Earthquake Resistant Buildings"
    const topicName = row["Topic"];     // e.g., "Civil"
    const examNames = row["Exams"] ? row["Exams"].split(',').map(s => s.trim()).filter(Boolean) : [];

    console.log(`\nProcessing QID: ${qId}`);

    // 1. Fetch Question UUID
    const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('id, subject_id')
        .eq('testpress_id', qId)
        .limit(1);

    if (qError || !questions.length) {
        console.log(`❌ Question ${qId} not found.`);
        return;
    }
    const question = questions[0];
    console.log(`   Found Question: ${question.id}`);

    // 2. Map Subject
    // Priority: 'Subject' column. Parent: 'Topic'.
    // We search for a Subject named 'Subject' with parent named 'Topic' (if possible), or just 'Subject'.

    // First try valid specific subject
    let { data: subjects, error: sError } = await supabase
        .from('subjects')
        .select('id, parent_id, name')
        .ilike('name', subjectName);

    let finalSubjectId = null;

    if (subjects && subjects.length > 0) {
        if (subjects.length === 1) {
            finalSubjectId = subjects[0].id;
        } else {
            console.log(`   ⚠️ Multiple subjects found for "${subjectName}". Checking parent "${topicName}"...`);
            // Try to filter by parent ID if we can resolve parent
            // Not implemented yet, picking first for now or null
            finalSubjectId = subjects[0].id; // Fallback
        }
    } else {
        console.log(`   ⚠️ Subject "${subjectName}" not found.`);
    }

    if (finalSubjectId && finalSubjectId !== question.subject_id) {
        const { error: updateError } = await supabase
            .from('questions')
            .update({ subject_id: finalSubjectId })
            .eq('id', question.id);

        if (!updateError) console.log(`   ✅ Updated Subject to "${subjectName}"`);
        else console.error('   ❌ Failed to update subject:', updateError.message);
    } else if (finalSubjectId) {
        console.log(`   INFO: Subject already set correctly.`);
    }

    // 3. Map Exams
    // Unique exam names
    const uniqueExams = [...new Set(examNames)];

    for (const examName of uniqueExams) {
        // Find exam
        const { data: exams } = await supabase
            .from('exams')
            .select('id')
            .ilike('title', examName)
            .limit(1);

        if (exams && exams.length > 0) {
            const examId = exams[0].id;
            // Check if link exists
            const { data: links } = await supabase
                .from('exam_questions')
                .select('*')
                .eq('exam_id', examId)
                .eq('question_id', question.id);

            if (!links || links.length === 0) {
                const { error: linkError } = await supabase
                    .from('exam_questions')
                    .insert({ exam_id: examId, question_id: question.id, order: 0 }); // Default order

                if (!linkError) console.log(`   ✅ Linked to Exam: "${examName}"`);
                else console.error(`   ❌ Failed to link exam ${examName}:`, linkError.message);
            } else {
                console.log(`   INFO: Already linked to "${examName}"`);
            }
        } else {
            console.log(`   ⚠️ Exam "${examName}" not found.`);
        }
    }
}

async function run() {
    for (const row of SAMPLE_DATA) {
        await processRow(row);
    }
}

run();
