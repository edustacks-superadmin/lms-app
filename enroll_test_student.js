import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enrollStudentInCourse() {
    const studentEmail = 'demo.student.lms@gmail.com';

    // 1. Get student member ID
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('email', studentEmail)
        .single();

    if (memberError || !member) {
        console.error('Error fetching member:', memberError);
        return;
    }

    const studentId = member.id;
    console.log('Student ID:', studentId);

    // 2. Get all courses
    const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title');

    if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
    }

    console.log('Available courses:', courses);

    if (courses.length === 0) {
        console.log('No courses available. Please create a course first.');
        return;
    }

    // Use the first course
    const courseId = courses[0].id;
    console.log(`Enrolling student in: ${courses[0].title} (${courseId})`);

    // 3. Check if already enrolled
    const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .single();

    if (existingEnrollment) {
        console.log('Student is already enrolled in this course.');
    } else {
        // 4. Create enrollment
        const { error: enrollError } = await supabase
            .from('enrollments')
            .insert([{
                student_id: studentId,
                course_id: courseId,
                enrolled_at: new Date().toISOString(),
                progress: 0
            }]);

        if (enrollError) {
            console.error('Error creating enrollment:', enrollError);
        } else {
            console.log('✅ Student enrolled successfully!');
        }
    }

    // 5. Check if course has chapters
    const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('course_id', courseId);

    if (chaptersError) {
        console.error('Error fetching chapters:', chaptersError);
    } else {
        console.log(`Course has ${chapters.length} chapters:`, chapters);
        if (chapters.length === 0) {
            console.log('⚠️ This course has no chapters. Please add chapters via the admin panel to test the Course Player.');
        }
    }
}

enrollStudentInCourse();
