/**
 * Fix Corrupted R2 URLs - Direct String Replace
 * 
 * The URLs have garbage text:
 * https://pub-xxx.r2.devNEXT_PUBLIC_SUPABASE_URL="https://..."/chapter-content/...
 * 
 * This script fixes them to:
 * https://pub-xxx.r2.dev/chapter-content/...
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// The corrupted pattern that needs to be removed
const GARBAGE_PATTERN = 'NEXT_PUBLIC_SUPABASE_URL="https://xalbtjoykovnlbjeddtv.supabase.co"';

async function fixUrls() {
    console.log('🔧 Fixing Corrupted R2 URLs (V2)');
    console.log('================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE FIX'}`);
    console.log('');

    // Fetch all chapter_contents with corrupted URLs
    const { data: contents, error } = await supabase
        .from('chapter_contents')
        .select('id, url')
        .like('url', '%NEXT_PUBLIC%');

    if (error) {
        console.error('Error fetching contents:', error.message);
        return;
    }

    console.log(`Found ${contents?.length || 0} corrupted URLs\n`);

    let fixed = 0;
    let failed = 0;

    for (const content of contents || []) {
        const oldUrl = content.url;

        // Remove the garbage pattern
        const newUrl = oldUrl.replace(GARBAGE_PATTERN, '');

        console.log(`[${fixed + 1}] ID: ${content.id}`);
        console.log(`   Old: ${oldUrl.substring(0, 80)}...`);
        console.log(`   New: ${newUrl.substring(0, 80)}...`);

        if (!DRY_RUN) {
            const { error: updateError } = await supabase
                .from('chapter_contents')
                .update({ url: newUrl })
                .eq('id', content.id);

            if (updateError) {
                console.log(`   ❌ Error: ${updateError.message}`);
                failed++;
                continue;
            }
            console.log('   ✅ Fixed');
        } else {
            console.log('   📋 Would fix');
        }

        fixed++;
    }

    console.log('\n================================');
    console.log('📊 SUMMARY');
    console.log('================================');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply.');
    }
}

fixUrls().catch(console.error);
