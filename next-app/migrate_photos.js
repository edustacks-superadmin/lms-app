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

async function migratePhotos() {
    try {
        // 3. Fetch Candidates
        const members = await prisma.members.findMany({
            where: {
                photo_url: {
                    contains: 'testpress.in',
                    not: null
                }
            },
            take: 10 // Pilot Batch
        });

        console.log(`Found ${members.length} members to migrate.`);

        for (const member of members) {
            const oldUrl = member.photo_url;
            console.log(`Migrating Member ID: ${member.id} (${oldUrl})`);

            try {
                // A. Download Image
                const response = await fetch(oldUrl);
                if (!response.ok) {
                    console.error(`Failed to fetch image: ${response.statusText}`);
                    continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                const ext = contentType.split('/')[1] || 'jpg';
                const filename = `${member.id}.${ext}`;

                // B. Upload to Supabase
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from(BUCKET)
                    .upload(filename, buffer, {
                        contentType: contentType,
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`Upload error for ${member.id}:`, uploadError);
                    continue;
                }

                // C. Get Public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from(BUCKET)
                    .getPublicUrl(filename);

                console.log(`Success! New URL: ${publicUrl}`);

                // D. Update Database
                await prisma.members.update({
                    where: { id: member.id },
                    data: { photo_url: publicUrl }
                });

            } catch (err) {
                console.error(`Error processing member ${member.id}:`, err);
            }
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migratePhotos();
