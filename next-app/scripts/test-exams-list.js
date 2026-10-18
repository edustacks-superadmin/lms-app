const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testExamsListRelation() {
    try {
        console.log('Testing exams -> course_exams -> courses relation');
        const { data, error } = await supabase
            .from('exams')
            .select(`
                *,
                course_exams (
                    courses (
                        id,
                        title
                    )
                )
            `)
            .limit(1);

        if (error) {
            console.error('Error fetching exams list:', error.message);
        } else {
            console.log('Relation works!');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testExamsListRelation();
