/**
 * Fix Corrupted R2 URLs in products table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GARBAGE_PATTERN = 'NEXT_PUBLIC_SUPABASE_URL="https://xalbtjoykovnlbjeddtv.supabase.co"';

async function fixUrls() {
    console.log('🔧 Fixing Corrupted Product Image URLs');
    console.log('======================================');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, image')
        .like('image', '%NEXT_PUBLIC%');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${products?.length || 0} corrupted URLs\n`);

    let fixed = 0;
    for (const product of products || []) {
        const oldUrl = product.image;
        const newUrl = oldUrl.replace(GARBAGE_PATTERN, '');

        console.log(`[${fixed + 1}] ID: ${product.id}`);
        console.log(`   New: ${newUrl.substring(0, 70)}...`);

        const { error: updateError } = await supabase
            .from('products')
            .update({ image: newUrl })
            .eq('id', product.id);

        if (updateError) {
            console.log(`   ❌ Error: ${updateError.message}`);
        } else {
            console.log('   ✅ Fixed');
            fixed++;
        }
    }

    console.log('\n======================================');
    console.log(`✅ Fixed: ${fixed} URLs`);
}

fixUrls().catch(console.error);
