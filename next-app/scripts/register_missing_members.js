const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load envs
const envFiles = ['.env', '.env.local'];
envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file });
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function registerMembers() {
    console.log("Fetching results missing member_id...");
    const { data: results, error } = await supabase
        .from('external_exam_results')
        .select('*')
        .is('member_id', null);

    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    console.log(`Found ${results.length} records to process.`);

    // Group by email to avoid duplicate member creation within this run
    const emailGroups = {};
    results.forEach(res => {
        if (res.email) {
            if (!emailGroups[res.email]) emailGroups[res.email] = [];
            emailGroups[res.email].push(res);
        }
    });

    const emails = Object.keys(emailGroups);
    console.log(`Processing ${emails.size || emails.length} unique emails...`);

    for (const email of emails) {
        const group = emailGroups[email];
        const first = group[0];

        console.log(`\nProcessing: ${email} (${first.full_name})`);

        let memberId = null;

        // 1. Try to find existing member by email
        const { data: existingByEmail } = await supabase
            .from('members')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingByEmail) {
            memberId = existingByEmail.id;
            console.log(`  - Found existing member by email: ${memberId}`);
        } else {
            // 2. Try to find by phone (whatsapp_number)
            if (first.whatsapp_number) {
                const { data: existingByPhone } = await supabase
                    .from('members')
                    .select('id')
                    .eq('phone_number', first.whatsapp_number)
                    .maybeSingle();

                if (existingByPhone) {
                    memberId = existingByPhone.id;
                    console.log(`  - Found existing member by phone: ${memberId}`);
                }
            }
        }

        // 3. Create new member if not found
        if (!memberId) {
            console.log(`  - Creating new member...`);
            const { data: newMember, error: createError } = await supabase
                .from('members')
                .insert([{
                    email: email,
                    display_name: first.full_name,
                    phone_number: first.whatsapp_number,
                    birth_date: first.dob,
                    community: first.community,
                    gender: first.gender ? first.gender.toLowerCase() : null,
                    pstm: first.pstm_status === true || first.pstm_status === 'TRUE',
                    institute_id: first.institute_id || 10,
                    role: 'student',
                    is_active: true,
                    status: 'active'
                }])
                .select()
                .single();

            if (createError) {
                console.error(`  - Create error for ${email}:`, createError);
                continue;
            }
            memberId = newMember.id;
            console.log(`  - Created member ID: ${memberId}`);
        }

        // 4. Update all matching external_exam_results with memberId
        if (memberId) {
            console.log(`  - Updating ${group.length} result records...`);
            const { error: updateError } = await supabase
                .from('external_exam_results')
                .update({ member_id: memberId })
                .eq('email', email);

            if (updateError) {
                console.error(`  - Update error for ${email}:`, updateError);
            } else {
                console.log(`  - Success.`);
            }
        }
    }

    console.log("\nBatch registration complete.");
}

registerMembers();
