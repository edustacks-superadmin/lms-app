import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function showCoursesAndExams() {
    console.log("=== COURSES ===");
    const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
        .limit(10);

    if (courses) {
        courses.forEach(course => {
            console.log(`${course.name} (ID: ${course.id})`);
        });
    }

    console.log("\n=== EXAMS ===");
    const { data: exams } = await supabase
        .from('exams')
        .select('id, title, course_id')
        .limit(10);

    if (exams) {
        exams.forEach(exam => {
            console.log(`${exam.title} - course_id: ${exam.course_id || 'NOT SET'} (exam ID: ${exam.id})`);
        });
    }

    console.log("\n=== ENROLLMENTS ===");
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, courses(name)')
        .limit(5);

    if (enrollments) {
        console.log(`Found ${enrollments.length} enrollments`);
        enrollments.forEach(e => {
            console.log(`- User enrolled in: ${e.courses?.name || 'Unknown course'}`);
        });
    }
}

showCoursesAndExams();
