
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    // 1. Setup Supabase
    const envPath = path.join(__dirname, '../.env.local');
    // Basic parsing to avoid full dotenv dependency if not installed
    const envFile = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?$/m)?.[1];
    const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=["']?(.*?)["']?$/m)?.[1];

    if (!supabaseUrl || !supabaseKey) {
        console.error('Credentials not found');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const INSTITUTE_ID = 10;

    console.log('--- Seeding Categories ---');

    // 2. Ensure Categories Exist
    const categoriesToCreate = ['TNPSC', 'Civil Engineering', 'Study Tips'];
    const categoryMap = {};

    for (const name of categoriesToCreate) {
        // Check if exists
        let { data: existing } = await supabase
            .from('product_categories')
            .select('id')
            .eq('institute_id', INSTITUTE_ID)
            .eq('name', name)
            .single();

        if (!existing) {
            console.log(`Creating category: ${name}`);
            const { data: created, error } = await supabase
                .from('product_categories')
                .insert({ name, institute_id: INSTITUTE_ID })
                .select('id')
                .single();

            if (error) {
                console.error(`Error creating ${name}:`, error);
            } else {
                existing = created;
            }
        } else {
            console.log(`Category exists: ${name} (ID: ${existing.id})`);
        }

        if (existing) categoryMap[name] = existing.id;
    }

    // 3. Update Posts
    console.log('--- Updating Posts ---');

    // TNPSC Planner -> TNPSC
    await updatePostCategory(supabase, 'TNPSC Annual', categoryMap['TNPSC']);

    // AE 2026 -> Civil Engineering
    await updatePostCategory(supabase, 'TNPSC AE', categoryMap['Civil Engineering']);

    // Memory Hack -> Study Tips
    await updatePostCategory(supabase, 'Remember', categoryMap['Study Tips']);

    console.log('Done.');
}

async function updatePostCategory(supabase, titleLike, categoryId) {
    if (!categoryId) return;

    const { error } = await supabase
        .from('posts')
        .update({ category_id: categoryId })
        .ilike('title', `%${titleLike}%`)
        .eq('institute_id', 10);

    if (error) console.error(`Error updating posts for ${titleLike}:`, error);
    else console.log(`Updated posts matching "${titleLike}" to category ${categoryId}`);
}

main();
