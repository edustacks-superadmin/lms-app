const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoin() {
    console.log('Testing categories relationship name...');

    const now = new Date().toISOString();

    // Try with 'categories'
    console.log('\nTrying join with "categories":');
    const { data: data1, error: error1 } = await supabase
        .from('posts')
        .select('id, title, categories(name, color)')
        .eq('is_deleted', false)
        .lte('publication_date', now)
        .limit(1);

    if (error1) {
        console.log('Error with "categories":', error1.message);
    } else {
        console.log('Success with "categories":', JSON.stringify(data1, null, 2));
    }

    // Try with 'category'
    console.log('\nTrying join with "category":');
    const { data: data2, error: error2 } = await supabase
        .from('posts')
        .select('id, title, category(name, color)')
        .eq('is_deleted', false)
        .lte('publication_date', now)
        .limit(1);

    if (error2) {
        console.log('Error with "category":', error2.message);
    } else {
        console.log('Success with "category":', JSON.stringify(data2, null, 2));
    }
}

testJoin();
