const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reverseCourseOrder() {
    try {
        console.log('🔄 Reversing course order...\n');

        // 1. Fetch all courses ordered by current order field
        const { data: courses, error: fetchError } = await supabase
            .from('courses')
            .select('id, title, order')
            .order('order', { ascending: true });

        if (fetchError) throw fetchError;

        console.log(`📚 Found ${courses.length} courses`);

        if (courses.length === 0) {
            console.log('⚠️  No courses found to reverse');
            return;
        }

        // 2. Reverse the array
        const reversedCourses = [...courses].reverse();

        console.log('\nReversing order:');
        console.log(`First course (was order ${courses[0].order}): ${courses[0].title}`);
        console.log(`Will become order ${reversedCourses[0].order}: ${reversedCourses[0].title}`);
        console.log('');
        console.log(`Last course (was order ${courses[courses.length - 1].order}): ${courses[courses.length - 1].title}`);
        console.log(`Will become order ${reversedCourses[reversedCourses.length - 1].order}: ${reversedCourses[reversedCourses.length - 1].title}`);
        console.log('');

        // 3. Update each course with its new order value
        console.log('⏳ Updating courses...');

        const updates = reversedCourses.map((course, index) => ({
            id: course.id,
            newOrder: index,
            title: course.title
        }));

        let updatedCount = 0;
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('courses')
                .update({ order: update.newOrder })
                .eq('id', update.id);

            if (updateError) {
                console.error(`❌ Error updating course ${update.title}:`, updateError);
            } else {
                updatedCount++;
                if (updatedCount % 20 === 0) {
                    console.log(`   Updated ${updatedCount}/${courses.length} courses...`);
                }
            }
        }

        console.log(`\n✅ Successfully reversed order of ${updatedCount} courses!`);
        console.log('\n💡 Refresh your browser to see the new order.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

reverseCourseOrder();
