
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?$/m)?.[1];
    const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=["']?(.*?)["']?$/m)?.[1];

    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const INSTITUTE_ID = 10;

    console.log('--- Correcting Post Categories ---');

    // 1. TNPSC -> 2
    await updateCategory(supabase, 'TNPSC Annual', 2);

    // 2. TNPSC AE -> 8
    await updateCategory(supabase, 'TNPSC AE', 8);

    // 3. Memory / Study Tips -> 1 (Mahesh IES Academy / General)
    await updateCategory(supabase, 'Remember', 1);

    console.log('Done.');
}

async function updateCategory(supabase, titleLike, catId) {
    const { error } = await supabase
        .from('posts')
        .update({ category_id: catId })
        .ilike('title', `%${titleLike}%`)
        .eq('institute_id', 10);

    if (error) console.error(`Error ${titleLike}:`, error);
    else console.log(`Set "${titleLike}" -> ${catId}`);
}

main();
