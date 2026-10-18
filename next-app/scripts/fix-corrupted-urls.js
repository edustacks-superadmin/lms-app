const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for corrupted URLs in testimonials...');

    // Fetch all testimonials to check (could filter by contains, but string filter might differ)
    const testimonials = await prisma.testimonials.findMany();

    let fixedCount = 0;

    for (const t of testimonials) {
        if (t.image_url && t.image_url.includes('NEXT_PUBLIC_SUPABASE_URL')) {
            console.log(`Found corrupted URL for ID ${t.id}:`);
            console.log(`  Original: ${t.image_url}`);

            // Pattern: https://<domain>.r2.devNEXT_PUBLIC_SUPABASE_URL="<junk>"/<real_path>
            // We want https://<domain>.r2.dev/<real_path>

            // 1. Extract domain (ends with .r2.dev or .com)
            // But strict regex might be hard. 
            // We know the separator is 'NEXT_PUBLIC_SUPABASE_URL'

            const parts = t.image_url.split('NEXT_PUBLIC_SUPABASE_URL');
            if (parts.length > 1) {
                const prefix = parts[0];
                // prefix e.g. "https://pub-xxxx.r2.dev"

                // suffix e.g. "=\"https://...co\"/testimonials/filename"
                // We need to find where the real path starts.
                // Usually "/testimonials/"

                const suffix = parts[1];
                const pathIndex = suffix.indexOf('/testimonials/');
                if (pathIndex !== -1) {
                    const realKey = suffix.substring(pathIndex); // "/testimonials/filename"
                    const newUrl = prefix + realKey;

                    console.log(`  Fixed:    ${newUrl}`);

                    await prisma.testimonials.update({
                        where: { id: t.id },
                        data: { image_url: newUrl }
                    });
                    fixedCount++;
                } else {
                    console.warn('  Could not extract key from suffix:', suffix);
                }
            }
        }
    }

    console.log(`Fixed ${fixedCount} corrupted records.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
