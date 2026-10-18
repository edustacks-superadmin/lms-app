const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Using Native version in node 18+

// 1. Env Loader
function loadEnv() {
    const files = ['.env.local', '.env', '.env.development'];
    const env = {};
    for (const file of files) {
        try {
            const envPath = path.resolve(file);
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                content.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                        if (!env[key]) env[key] = value;
                    }
                });
            }
        } catch (e) { }
    }
    return env;
}

const env = loadEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials.');
    process.exit(1);
}

// 2. Clients
const prisma = new PrismaClient();
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET = 'avatars';
const BATCH_SIZE = 20; // Concurrent uploads per batch

async function migrateAllPhotos() {
    try {
        console.log('Fetching all members with Testpress photos...');
        // Fetch only IDs AND Urls to process
        const allMembers = await prisma.members.findMany({
            where: {
                photo_url: {
                    contains: 'testpress.in'
                }
            },
            select: { id: true, photo_url: true }
        });

        console.log(`Total members to migrate: ${allMembers.length}`);

        let processed = 0;
        let success = 0;
        let failed = 0;

        // Process in chunks
        for (let i = 0; i < allMembers.length; i += BATCH_SIZE) {
            const chunk = allMembers.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i + 1} - ${i + chunk.length}...`);

            await Promise.all(chunk.map(async (member) => {
                try {
                    if (!member.photo_url) return;

                    // A. Download
                    const response = await fetch(member.photo_url);
                    if (!response.ok) {
                        // console.error(`Failed to fetch for ${member.id} (${response.status})`);
                        failed++;
                        return;
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    const ext = contentType.split('/')[1] || 'jpg';
                    const filename = `${member.id}.${ext}`;

                    // B. Upload
                    const { error: uploadError } = await supabase
                        .storage
                        .from(BUCKET)
                        .upload(filename, buffer, {
                            contentType: contentType,
                            upsert: true
                        });

                    if (uploadError) {
                        // console.error(`Upload error for ${member.id}:`, uploadError.message);
                        failed++;
                        return;
                    }

                    // C. Public URL
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from(BUCKET)
                        .getPublicUrl(filename);

                    // D. Update DB (Critical: select only ID)
                    await prisma.members.update({
                        where: { id: member.id },
                        data: { photo_url: publicUrl },
                        select: { id: true }
                    });

                    success++;
                } catch (err) {
                    console.error(`Error for ${member.id}:`, err.message);
                    failed++;
                }
            }));

            processed += chunk.length;
            console.log(`Progress: ${processed}/${allMembers.length} (Success: ${success}, Failed: ${failed})`);
        }

        console.log(`migration COMPLETE.`);
        console.log(`Total Success: ${success}`);
        console.log(`Total Failed: ${failed}`);

    } catch (e) {
        console.error('Migration crashed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateAllPhotos();
