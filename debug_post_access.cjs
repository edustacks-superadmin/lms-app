const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from next-app/.env
const envPath = path.resolve(__dirname, 'next-app', '.env');
const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
    console.error("Error loading .env file:", envConfig.error);
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing environment variables after loading .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function debugPostAccess() {
    console.log("Debugging Post Access...");

    // 1. Fetch Institute
    const slug = 'maheshiesacademy'; // As per user URL
    const { data: institute, error: instError } = await supabaseAdmin
        .from('institute_settings')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

    if (instError) {
        console.error("Error fetching institute:", instError);
    } else {
        console.log("Institute Found:", institute);
    }

    // 2. Fetch Post by Slug
    const postSlug = 'how-to-crack-tnpsc-ae-exam-2026-qeqa';
    const { data: post, error: postError } = await supabaseAdmin
        .from('posts')
        .select('id, title, institute_id, access_control, is_deleted, slug')
        .eq('slug', postSlug)
        .single();

    if (postError) {
        console.error(`Error fetching Post slug '${postSlug}':`, postError);
    } else {
        console.log(`Post '${postSlug}' Details:`, post);

        if (institute && post) {
            const isMatch = post.institute_id === institute.id;
            console.log(`Institute Match: ${isMatch} (Post Institute: ${post.institute_id}, Current Institute: ${institute.id})`);

            if (!isMatch) {
                console.warn("MISMATCH! The post belongs to a different institute.");
            }
        }
    }
}

debugPostAccess();
