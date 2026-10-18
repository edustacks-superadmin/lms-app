const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to load envs manually
function loadEnv() {
    const files = ['.env.local', '.env', '.env.development'];
    const env = {};

    for (const file of files) {
        try {
            const envPath = path.resolve(file);
            if (fs.existsSync(envPath)) {
                console.log(`Loading env from ${file}`);
                const content = fs.readFileSync(envPath, 'utf8');
                content.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                        // Don't overwrite if already set (priority order)
                        if (!env[key]) {
                            env[key] = value;
                        }
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
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.log('Available keys:', Object.keys(env));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    try {
        console.log('Creating "avatars" bucket...');
        const { data, error } = await supabase
            .storage
            .createBucket('avatars', {
                public: true,
                fileSizeLimit: 5242880,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('Bucket "avatars" already exists.');
            } else {
                throw error;
            }
        } else {
            console.log('Bucket "avatars" created successfully.');
        }

    } catch (err) {
        console.error('Error creating bucket:', err);
    }
}

createBucket();
