const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// Load environment variables manually or rely on hardcoded for this script
// Using values from .env.local view
const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98'; // SERVICE ROLE KEY

const supabase = createClient(supabaseUrl, supabaseKey);

async function deletePhotos() {
    try {
        console.log('Reading member.xlsx...');
        const workbook = XLSX.readFile('member.xlsx');
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const data = XLSX.utils.sheet_to_json(worksheet);

        // Extract Emails
        const members = data.map(row => {
            const keys = Object.keys(row);
            const emailKey = keys.find(k => k.trim().toLowerCase().includes('mail'));
            return emailKey ? row[emailKey] : null;
        }).filter(email => email);

        if (members.length === 0) {
            console.log('No members found in Excel.');
            return;
        }

        const allMembers = members;
        console.log(`Processing all ${allMembers.length} members for photo deletion.`);

        const BATCH_SIZE = 50;
        let processedCount = 0;
        let deletedCount = 0;

        for (let i = 0; i < allMembers.length; i += BATCH_SIZE) {
            const batchEmails = allMembers.slice(i, i + BATCH_SIZE);
            console.log(`\nFetching batch ${Math.floor(i / BATCH_SIZE) + 1}... (${batchEmails.length} emails)`);

            const { data: dbMembers, error } = await supabase
                .from('members')
                .select('email, photo_url')
                .in('email', batchEmails);

            if (error) {
                console.error('Error fetching batch:', error);
                continue;
            }

            for (const email of batchEmails) {
                const member = dbMembers.find(m => m.email === email);

                if (!member) {
                    console.log(`[${email}]: NOT FOUND in DB.`);
                    continue;
                }

                if (!member.photo_url) {
                    // console.log(`[${email}]: No photo_url. Skipping.`); 
                    continue;
                }

                const photoUrl = member.photo_url;

                try {
                    // Heuristic parsing
                    const urlParts = photoUrl.split('/storage/v1/object/public/');
                    if (urlParts.length !== 2) {
                        console.error(`[${email}]: Could not parse URL structure. Skipping.`);
                        continue;
                    }

                    const fullPath = urlParts[1];
                    const pathParts = fullPath.split('/');
                    const bucketName = pathParts[0];
                    const filePath = pathParts.slice(1).join('/');

                    console.log(`[${email}]: Deleting '${filePath}'...`);

                    // 1. Delete from Storage
                    const { error: storageError } = await supabase
                        .storage
                        .from(bucketName)
                        .remove([filePath]);

                    if (storageError) {
                        console.error(`[${email}]: Storage deletion failed:`, storageError);
                        continue;
                    }

                    // 2. Update DB
                    const { error: dbUpdateError } = await supabase
                        .from('members')
                        .update({ photo_url: null })
                        .eq('email', email);

                    if (dbUpdateError) {
                        console.error(`[${email}]: DB Update failed:`, dbUpdateError);
                    } else {
                        console.log(`[${email}]: Success.`);
                        deletedCount++;
                    }

                } catch (parseError) {
                    console.error(`[${email}]: Error:`, parseError);
                }
            }
            processedCount += batchEmails.length;
        }

        console.log(`\nProcessing complete. Total photos deleted: ${deletedCount}`);

    } catch (err) {
        console.error('Global Error:', err);
    }
}

deletePhotos();
