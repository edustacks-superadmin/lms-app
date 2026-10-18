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
const TARGET_ID = 13775;

async function migrateSingleUser() {
    try {
        // 3. Fetch Member (Select only needed fields to avoid schema mismatch on birth_date)
        const member = await prisma.members.findFirst({
            where: { id: TARGET_ID },
            select: { id: true, photo_url: true }
        });

        if (!member) {
            console.log(`Member ID ${TARGET_ID} not found.`);
            return;
        }

        console.log(`Checking Member ID: ${member.id}`);
        console.log(`Current Photo URL: ${member.photo_url}`);

        if (member.photo_url && member.photo_url.includes('supabase.co')) {
            console.log('Already migrated.');
            // Force update purely for testing if needed
        }

        const oldUrl = member.photo_url;
        if (!oldUrl) {
            console.log('No photo URL to migrate.');
            return;
        }

        try {
            // A. Download Image
            console.log(`Downloading from ${oldUrl}...`);
            const response = await fetch(oldUrl);
            if (!response.ok) {
                console.error(`Failed to fetch image: ${response.statusText}`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.split('/')[1] || 'jpg';
            const filename = `${member.id}.${ext}`;

            // B. Upload to Supabase
            console.log(`Uploading to Supabase Storage as ${filename}...`);
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from(BUCKET)
                .upload(filename, buffer, {
                    contentType: contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`Upload error:`, uploadError);
                return;
            }

            // C. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from(BUCKET)
                .getPublicUrl(filename);

            console.log(`Success! New URL: ${publicUrl}`);

            // D. Update Database - CRITICAL: Select only ID to avoid checking other fields
            await prisma.members.update({
                where: { id: member.id },
                data: { photo_url: publicUrl },
                select: { id: true }
            });
            console.log('Database updated.');

        } catch (err) {
            console.error(`Error processing member ${member.id}:`, err);
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateSingleUser();
