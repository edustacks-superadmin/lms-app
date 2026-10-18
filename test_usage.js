
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsage() {
    console.log('Fetching questions...');
    const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('id, question_text')
        .limit(5);

    if (qError) {
        console.error('Error fetching questions:', qError);
        return;
    }

    console.log(`Fetched ${questions.length} questions.`);
    const questionIds = questions.map(q => q.id);
    console.log('Question IDs:', questionIds);

    console.log('Fetching usage...');

    // Test Folder Usage
    const { data: folderData, error: folderError } = await supabase
        .from('question_folder_items')
        .select('question_id, folder_id, question_folders(name)')
        .in('question_id', questionIds);

    if (folderError) {
        console.error('Error fetching folder usage:', folderError);
    } else {
        console.log('Folder Usage Data:', JSON.stringify(folderData, null, 2));
    }

    // Test Exam Usage
    const { data: examData, error: examError } = await supabase
        .from('exam_questions')
        .select('question_id, exam_id, exams(title)')
        .in('question_id', questionIds);

    if (examError) {
        console.error('Error fetching exam usage:', examError);
    } else {
        console.log('Exam Usage Data:', JSON.stringify(examData, null, 2));
    }
}

testUsage();
