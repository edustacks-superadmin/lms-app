console.log('Script started: fix-all-corrupted-urls.js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function fixTable(modelName, fields) {
    console.log(`Checking table: ${modelName}...`);
    try {
        // dynamic access to prisma model
        const model = prisma[modelName];
        if (!model) {
            console.error(`Model ${modelName} not found.`);
            return;
        }

        const records = await model.findMany();
        let fixedCount = 0;

        for (const record of records) {
            const updates = {};
            let needsUpdate = false;

            for (const field of fields) {
                const url = record[field];
                if (url && typeof url === 'string' && url.includes('NEXT_PUBLIC_SUPABASE_URL')) {
                    console.log(`  Found corrupted ${field} for ID ${record.id}:`);
                    // console.log(`    Original: ${url}`);

                    const parts = url.split('NEXT_PUBLIC_SUPABASE_URL');
                    if (parts.length > 1) {
                        const prefix = parts[0];
                        const suffix = parts[1];

                        // Heuristic: find the first slash that starts a path typically used
                        // Known buckets: 'institute-assets', 'home-images', 'banner-ads', 'testimonials', 'icons'
                        // Regex to find start of path: /<bucket-name>/

                        const buckets = ['institute-assets', 'home-images', 'banner-ads', 'testimonials', 'icons'];
                        let realKey = null;

                        // Try to find bucket in suffix
                        for (const b of buckets) {
                            const idx = suffix.indexOf(`/${b}/`);
                            if (idx !== -1) {
                                realKey = suffix.substring(idx);
                                break;
                            }
                        }

                        // Fallback if bucket not found (maybe other path?)
                        if (!realKey) {
                            // Try finding just the first slash after some junk? 
                            // Suffix is like ="https://...co"/<bucket>/...
                            // So finding /. might work
                            const match = suffix.match(/"(\/[^"]+)/); // Matches "/bucket/file"
                            if (match) {
                                realKey = match[1];
                            }
                        }

                        if (realKey) {
                            const newUrl = prefix + realKey;
                            // console.log(`    Fixed:    ${newUrl}`);
                            updates[field] = newUrl;
                            needsUpdate = true;
                        } else {
                            console.warn(`    Could not extract key from suffix for ${field}:`, suffix.substring(0, 50));
                        }
                    }
                }
            }

            if (needsUpdate) {
                await model.update({
                    where: { id: record.id },
                    data: updates
                });
                console.log(`  Fixed ID ${record.id}`);
                fixedCount++;
            }
        }
        console.log(`  Fixed ${fixedCount} records in ${modelName}.`);

    } catch (e) {
        console.error(`Error processing ${modelName}:`, e);
    }
}

async function main() {
    await fixTable('institute_settings', ['logo_url', 'favicon_url', 'upi_qr_url']);
    await fixTable('home_settings', ['hero_banner_image', 'institute_logo_url']);
    await fixTable('banner_ads', ['image_url']);
    await fixTable('testimonials', ['image_url']);

    // Also check other potential tables just in case
    await fixTable('chapters', ['icon']);
    await fixTable('courses', ['image']);
    // products table?
    // prisma schema check for products... not visible in previous view, assuming 'products' or similar if exists.
    // 'courses' has 'image'.

}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
