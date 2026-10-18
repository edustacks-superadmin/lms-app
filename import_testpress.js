import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

// 1. Supabase Credentials (from your project)
const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'; // Anon key (Service Role key is better for imports)

// 2. Testpress Credentials
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/'; // e.g., https://your-institute.testpress.in
const TESTPRESS_USERNAME = 'admin';
const TESTPRESS_PASSWORD = '0123443210';

// ==========================================
// SETUP
// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function loginToTestpress() {
    console.log('Logging in to Testpress...');

    const endpoints = [
        '/api/v2.5/auth/login/',
        '/api/v2.4/auth/login/',
        '/api/v2.3/auth/login/',
        '/api/v2.2/auth/login/',
        '/api/v2.5/auth-token/',
        '/api/v2.4/auth-token/',
        '/api-token-auth/',
        '/api/v2.5/api-token-auth/'
    ];

    for (const endpoint of endpoints) {
        const url = `${TESTPRESS_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        console.log(`Trying login at: ${url}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: TESTPRESS_USERNAME, password: TESTPRESS_PASSWORD })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Login successful!');
                return data.token || data.key;
            } else {
                console.log(`Failed with status: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error connecting to ${url}:`, error.message);
        }
    }

    console.error('All login attempts failed.');
    return null;
}

async function fetchFromTestpress(endpoint, token) {
    // If endpoint is a full URL (from pagination or linking), use it directly
    if (endpoint.startsWith('http')) {
        console.log(`Fetching full URL: ${endpoint}...`);
        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `JWT ${token}` }
            });
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error.message);
            return null;
        }
    }

    // Otherwise try versions
    const versions = ['v2.5', 'v2.4', 'v2.3', 'v2.2'];
    const baseEndpoint = endpoint.replace(/^\/api\/v\d+\.\d+\//, '/'); // Remove version if present

    for (const v of versions) {
        const url = `${TESTPRESS_BASE_URL.replace(/\/$/, '')}/api/${v}${baseEndpoint}`;
        console.log(`Fetching ${url}...`);

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `JWT ${token}` }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(`Error connecting to ${url}:`, error.message);
        }
    }

    console.error(`Failed to fetch ${endpoint} from any API version`);
    return null;
}

// ==========================================
// MIGRATION FUNCTIONS
// ==========================================

async function migrateFolders(token) {
    console.log('\n--- Migrating Folders ---');
    // Hypothetical endpoint
    const data = await fetchFromTestpress('/folders/', token);
    if (!data || !data.results) return;

    for (const tpFolder of data.results) {
        console.log(`Processing folder: ${tpFolder.name}`);

        const { data: folder, error } = await supabase
            .from('question_folders')
            .insert({
                name: tpFolder.name,
                description: tpFolder.description || 'Imported from Testpress'
            })
            .select()
            .single();

        if (error) console.error('Error inserting folder:', error.message);
        else console.log(`Saved folder: ${folder.name} (${folder.id})`);
    }
}

async function migrateExams(token) {
    console.log('\n--- Migrating Exams ---');
    const data = await fetchFromTestpress('/exams/', token);
    if (!data || !data.results) return;

    // Helper to parse duration (HH:MM:SS or minutes)
    const parseDuration = (d) => {
        if (!d) return 0;
        if (typeof d === 'string' && d.includes(':')) {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) return (parts[0] * 60) + parts[1]; // H*60 + M
            if (parts.length === 2) return parts[0]; // M:S -> assume M
        }
        return parseInt(d) || 0;
    };

    for (const tpExam of data.results) {
        console.log(`Processing exam: ${tpExam.title}`);

        // DEBUG: Write first exam to file to inspect structure
        if (data.results.indexOf(tpExam) === 0) {
            fs.writeFileSync('debug_exam.json', JSON.stringify(tpExam, null, 2));
        }

        // Calculate marks
        let marks = parseFloat(tpExam.total_marks);
        if (isNaN(marks)) marks = parseFloat(tpExam.marks);
        if (isNaN(marks)) marks = 100; // Default

        const { data: exam, error } = await supabase
            .from('exams')
            .insert({
                title: `${tpExam.title} [${new Date().toLocaleTimeString()}]`,
                description: tpExam.description || 'Imported from Testpress',
                duration_minutes: parseDuration(tpExam.duration) || 60,
                start_date: tpExam.start_date || new Date().toISOString(),
                end_date: tpExam.end_date || new Date(Date.now() + 86400000).toISOString(),
                total_marks: marks,
                passing_marks: tpExam.passing_marks || (marks * 0.4),
                is_active: true,
                variable_marks: tpExam.variable_mark_per_question || false
            })
            .select()
            .single();

        if (error) {
            console.error('Error inserting exam:', error.message);
            continue;
        }

        console.log(`Saved exam: ${exam.title} (${exam.id})`);

        // Fetch questions for this exam using the correct Testpress API endpoint
        if (tpExam.id) {
            const questionsUrl = `/questions/?exam=${tpExam.id}`;
            console.log(`Fetching questions for exam ID ${tpExam.id}...`);
            await migrateExamQuestions(questionsUrl, token, exam.id, tpExam.id);
        } else {
            console.log(`⚠️ No exam ID found for: ${tpExam.title}`);
        }
    }
}

async function migrateExamQuestions(url, token, examId, tpExamId) {
    console.log(`\nFetching questions for Testpress exam ${tpExamId} -> LMS exam ${examId}...`);

    // Handle pagination if many questions
    const data = await fetchFromTestpress(url, token);

    if (!data) {
        console.log(`❌ No data returned from ${url}`);
        return;
    }

    if (!data.results || data.results.length === 0) {
        console.log(`⚠️ No questions found in response. Response keys: ${Object.keys(data).join(', ')}`);
        if (data.count !== undefined) {
            console.log(`   API reports ${data.count} total questions but results array is empty/missing`);
        }
        return;
    }

    console.log(`✅ Found ${data.results.length} questions to import`);

    for (const tpQuestion of data.results) {
        // 1. Insert Question
        const { data: question, error: qError } = await supabase
            .from('questions')
            .insert({
                question_text: tpQuestion.question_html || tpQuestion.question_text || tpQuestion.text,
                question_type: 'MCQ, Single Correct Question', // Default
                marks: tpQuestion.marks || 1,
                explanation: tpQuestion.explanation_html || tpQuestion.explanation || ''
            })
            .select()
            .single();

        if (qError) {
            console.error('❌ Error inserting question:', qError.message);
            continue;
        }

        console.log(`   ✓ Inserted question ${question.id}`);

        // 2. Link to Exam
        const { error: linkError } = await supabase
            .from('exam_questions')
            .insert({
                exam_id: examId,
                question_id: question.id
            });

        if (linkError) {
            console.error('❌ Error linking question to exam:', linkError.message);
        }

        // 3. Insert Options
        if (tpQuestion.answers && Array.isArray(tpQuestion.answers)) {
            const options = tpQuestion.answers.map((ans, idx) => ({
                question_id: question.id,
                option_label: String.fromCharCode(65 + idx), // A, B, C...
                option_text: ans.text_html || ans.text || ans.answer,
                is_correct: ans.is_correct || false
            }));

            const { error: oError } = await supabase
                .from('question_options')
                .insert(options);

            if (oError) {
                console.error('❌ Error inserting options:', oError.message);
            } else {
                console.log(`   ✓ Added ${options.length} options`);
            }
        } else {
            console.log(`   ⚠️ No answers found for question`);
        }
    }

    console.log(`✅ Completed importing questions for exam ${examId}`);
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runMigration() {
    console.log('Starting migration...');

    // 1. Login
    // const token = await loginToTestpress();
    // if (!token) return;

    // For testing without real login, uncomment above and comment below
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

    // 2. Run Migrations
    await migrateFolders(token);
    await migrateExams(token);

    console.log('Migration complete!');
}

runMigration();
