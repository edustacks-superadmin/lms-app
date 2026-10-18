const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_CTSE_DIP_ITI_2025';
const INSTITUTE_ID = 10;
const FILE_NAME = 'CTSE 10_2025 (Diploma_ITI Level) (Responses).xlsx';

// Helper to handle Excel Date Serial Numbers or String dates
function parseExcelDate(excelDate) {
    if (!excelDate) return null;

    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
        const date = XLSX.SSF.parse_date_code(excelDate);
        return new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString();
    }

    // If it's a string like DD/MM/YYYY
    if (typeof excelDate === 'string' && excelDate.includes('/')) {
        const [day, month, year] = excelDate.split('/');
        return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
    }

    return null;
}

async function bulkImport() {
    const filePath = path.join(__dirname, '..', FILE_NAME);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`🚀 Starting bulk import from Excel: ${data.length} records found...`);

    const results = { success: 0, failed: 0, profileUpdated: 0 };

    for (const row of data) {
        const email = row['email']?.trim();
        const phone = String(row['phone number'] || '').trim();
        const name = (row['Full Name'] || row['Name'])?.trim();
        const dobRaw = row['Date of Birth'] || row['birth date'];
        const regNo = String(row['registration number'] || '').trim();
        const admitCardUrl = row['Admit card url']?.trim();
        const photoUrl = (row['Passport size photo'] || row['photo_url'])?.trim();

        if (!email) continue;

        console.log(`\n--- Processing: ${email} ---`);

        // 1. Find Member (Enforce institute_id = 10)
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('email', email)
            .eq('institute_id', INSTITUTE_ID)
            .maybeSingle();

        const parsedDob = parseExcelDate(dobRaw);
        let memberId = member?.id;

        if (!member) {
            console.log(`   🆕 Student not found. Creating pre-registered profile for ${email}...`);
            const { data: newMember, error: insertError } = await supabase
                .from('members')
                .insert({
                    email: email,
                    display_name: name,
                    phone_number: phone,
                    birth_date: parsedDob,
                    photo_url: photoUrl,
                    institute_id: INSTITUTE_ID,
                    is_active: true,
                    role: 'student'
                })
                .select('id')
                .single();

            if (insertError) {
                console.error(`   ❌ Failed to create member:`, insertError.message);
                results.failed++;
                continue;
            }
            memberId = newMember.id;
            results.profileCreated = (results.profileCreated || 0) + 1;
        } else {
            // 2. Profile Enrichment (Only fill if missing)
            const profileUpdates = {};
            if (!member.display_name && name) profileUpdates.display_name = name;
            if (!member.phone_number && phone) profileUpdates.phone_number = phone;
            if (!member.birth_date && parsedDob) profileUpdates.birth_date = parsedDob;
            if (!member.photo_url && photoUrl) profileUpdates.photo_url = photoUrl;

            if (Object.keys(profileUpdates).length > 0) {
                console.log(`   📝 Updating profile fields: ${Object.keys(profileUpdates).join(', ')}`);
                const { error: updateError } = await supabase
                    .from('members')
                    .update(profileUpdates)
                    .eq('id', member.id);

                if (updateError) {
                    console.error(`   ❌ Profile update failed:`, updateError.message);
                } else {
                    results.profileUpdated++;
                }
            }
            memberId = member.id;
        }

        // 3. Exam Application Sync
        const applicationPayload = {
            member_id: memberId,
            exam_tag: EXAM_TAG,
            registration_number: regNo,
            admit_card_url: admitCardUrl,
            status: 'applied',
            updated_at: new Date().toISOString()
        };

        const { error: appError } = await supabase
            .from('exam_applications')
            .upsert(applicationPayload, {
                onConflict: 'member_id,exam_tag'
            });

        if (appError) {
            console.error(`   ❌ Application sync failed:`, appError.message);
            results.failed++;
        } else {
            console.log(`   ✨ Successfully synced for ${name || email}`);
            results.success++;
        }
    }

    console.log(`\n🏁 Import Summary:`);
    console.log(`- Total Records: ${data.length}`);
    console.log(`- Successfully Synced: ${results.success}`);
    console.log(`- Profiles Enriched: ${results.profileUpdated}`);
    console.log(`- New Profiles Created: ${results.profileCreated || 0}`);
    console.log(`- Total Failures: ${results.failed}`);
}

const fs = require('fs');
bulkImport();
