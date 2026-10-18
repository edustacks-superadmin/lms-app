const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

// Sanitize R2 domain
let R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;
if (R2_PUBLIC_DOMAIN && R2_PUBLIC_DOMAIN.includes('NEXT_PUBLIC')) {
    R2_PUBLIC_DOMAIN = R2_PUBLIC_DOMAIN.split('NEXT_PUBLIC')[0].trim();
}

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating Posts Cover Image URLs from Supabase to R2...');
    console.log(`R2 Domain: ${R2_PUBLIC_DOMAIN}`);
    console.log(`Dry Run: ${DRY_RUN}`);

    // Find posts with Supabase URLs
    const posts = await prisma.posts.findMany({
        where: {
            cover_image: {
                contains: 'supabase.co/storage/v1/object/public/icons'
            }
        }
    });

    console.log(`Found ${posts.length} posts with Supabase URLs.`);

    let updated = 0;
    for (const post of posts) {
        const oldUrl = post.cover_image;

        // Extract path: .../icons/Custom/filename.jpg -> Custom/filename.jpg
        const marker = '/icons/';
        const partIndex = oldUrl.indexOf(marker);
        if (partIndex === -1) {
            console.warn(`  Post ${post.id}: Could not parse URL`);
            continue;
        }

        const relativePath = oldUrl.substring(partIndex + marker.length);
        const r2Key = `icons/${relativePath}`;
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Key}`;

        console.log(`Post ${post.id}: ${relativePath}`);
        console.log(`  Old: ${oldUrl.substring(0, 60)}...`);
        console.log(`  New: ${newUrl}`);

        if (!DRY_RUN) {
            await prisma.posts.update({
                where: { id: post.id },
                data: { cover_image: newUrl }
            });
            updated++;
            console.log('  ✅ Updated');
        }
    }

    console.log(`\nTotal updated: ${updated}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
