import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enrollStudent() {
    try {
        console.log('Starting enrollment process...');

        // 1. Get the mock student
        const { data: student, error: studentError } = await supabase
            .from('members')
            .select('id, email')
            .eq('email', 'student@demo.com')
            .single();

        if (studentError) {
            console.error('Error finding student:', studentError);
            return;
        }
        console.log('Found student:', student.email, student.id);

        // 2. Get a course (any course)
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('id, title')
            .limit(2);

        if (courseError) {
            console.error('Error finding courses:', courseError);
            return;
        }

        if (!courses || courses.length === 0) {
            console.error('No courses found in the database.');
            // Create a dummy course if none exist
            const { data: newCourse, error: createError } = await supabase
                .from('courses')
                .insert({
                    title: 'Introduction to React',
                    description: 'Learn the basics of React',
                    thumbnail_url: 'https://via.placeholder.com/300',
                    instructor_name: 'John Doe',
                    duration: '10h 30m'
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating dummy course:', createError);
                return;
            }
            console.log('Created dummy course:', newCourse.title);
            courses.push(newCourse);
        }

        console.log('Found courses:', courses.map(c => c.title));

        // 3. Enroll the student in the first course
        const courseToEnroll = courses[0];

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('student_id', student.id)
            .eq('course_id', courseToEnroll.id)
            .single();

        if (existingEnrollment) {
            console.log('Student already enrolled in:', courseToEnroll.title);
        } else {
            const { data: enrollment, error: enrollError } = await supabase
                .from('enrollments')
                .insert({
                    student_id: student.id,
                    course_id: courseToEnroll.id,
                    status: 'active',
                    progress: 0,
                    enrolled_at: new Date().toISOString()
                })
                .select()
                .single();

            if (enrollError) {
                console.error('Error enrolling student:', enrollError);
            } else {
                console.log('Successfully enrolled student in:', courseToEnroll.title);
            }
        }

        // Enroll in a second course if available, with some progress
        if (courses.length > 1) {
            const secondCourse = courses[1];
            const { data: existingEnrollment2 } = await supabase
                .from('enrollments')
                .select('*')
                .eq('student_id', student.id)
                .eq('course_id', secondCourse.id)
                .single();

            if (!existingEnrollment2) {
                await supabase
                    .from('enrollments')
                    .insert({
                        student_id: student.id,
                        course_id: secondCourse.id,
                        status: 'active',
                        progress: 45,
                        enrolled_at: new Date().toISOString()
                    });
                console.log('Successfully enrolled student in second course:', secondCourse.title);
            }
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

enrollStudent();
