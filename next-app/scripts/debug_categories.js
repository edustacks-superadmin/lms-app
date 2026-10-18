
const { createClient } = require('@supabase/supabase-js');

// Use env vars from .env.local if possible, but for simple script hardcoding or reading file is needed?
// Actually simpler is to use the existing supabase client if I can import it, but 'require' syntax vs 'import'.
// I will just use a direct query via a new script that just uses node-fetch or similar logic?
// Wait, I can't easily import from the next-app structure because of ES modules/imports.
// I'll stick to a standalone script with dummy logic or try to read the data using a specialized script I write now.
// Actually, I can use the same logic as the app but adapted for Node script.
// OR, I can use a browser tool to go to a page that dumps this info? No, user can't see it.
// Best way: Use `run_command` to query data via a script that connects to DB.
// Do I have DB credentials? Yes in .env.local. I'll read them.

const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?$/m)?.[1];
    const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=["']?(.*?)["']?$/m)?.[1];

    console.log('URL:', supabaseUrl); // Debug log to see what we parsed

    if (!supabaseUrl || !supabaseKey) {
        console.error('Could not find Supabase credentials');
        process.exit(1);
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkData() {
        // 1. Check posts category_ids
        console.log('Checking Posts...');
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('id, title, category_id, institute_id')
            .eq('institute_id', 10) // Assuming institute 10 as per previous logs
            .not('category_id', 'is', null)
            .limit(5);

        if (postsError) console.error('Posts Error:', postsError);
        else console.log('Sample Posts with Category:', posts);

        if (posts && posts.length > 0) {
            const catIds = posts.map(p => p.category_id);
            // 2. Check ALL categories for this institute
            console.log('Fetching ALL categories for institute 10...');
            const { data: cats, error: catsError } = await supabase
                .from('product_categories')
                .select('*')
                .eq('institute_id', 10);

            if (catsError) console.error('Cats Error:', catsError);
            else console.log('All Categories for Inst 10:', cats.map(c => `${c.id}:${c.name}`));
        } else {
            console.log('No posts found with category_id for institute 10.');
        }
    }

    checkData();

} catch (e) {
    console.error('Script Error:', e);
}
