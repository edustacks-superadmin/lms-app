const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestionsSchema() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .limit(1);

        if (error) throw error;

        console.log('Questions Columns:');
        // Insert dummy
        const { data: inserted, error: insertError } = await supabase
            .from('questions')
            .insert({ question_text: 'SCHEMA_CHECK_DUMMY' })
            .select()
            .single();

        if (insertError) {
            console.error('Insert Error:', insertError.message);
        } else {
            console.log('Inserted Dummy Keys:', Object.keys(inserted));
            // cleanup
            await supabase.from('questions').delete().eq('id', inserted.id);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkQuestionsSchema();
