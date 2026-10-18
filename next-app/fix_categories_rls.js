const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addPublicReadPolicy() {
    console.log('Adding public read policy for categories...\n');

    // Use raw SQL to add the policy
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            -- Drop existing policy if any
            DROP POLICY IF EXISTS "Public can read categories" ON categories;
            
            -- Create public read policy
            CREATE POLICY "Public can read categories" ON categories
            FOR SELECT USING (true);
        `
    });

    if (error) {
        console.log('RPC not available, trying direct approach...');

        // Alternative: Just verify using service role
        const { data: categories, error: fetchError } = await supabase
            .from('categories')
            .select('*');

        if (fetchError) {
            console.error('Error:', fetchError.message);
        } else {
            console.log('Categories exist:', categories.length);
            console.log('Categories:', categories.map(c => ({ id: c.id, name: c.name })));
        }

        console.log('\n⚠️  You need to manually add RLS policy in Supabase Dashboard:');
        console.log('1. Go to Supabase → Authentication → Policies');
        console.log('2. Find "categories" table');
        console.log('3. Add a new policy:');
        console.log('   - Name: "Public can read categories"');
        console.log('   - Operation: SELECT');
        console.log('   - Target roles: anon, authenticated');
        console.log('   - USING expression: true');
    } else {
        console.log('✅ Policy added successfully!');
    }
}

addPublicReadPolicy();
