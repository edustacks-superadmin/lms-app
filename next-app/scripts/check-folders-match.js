const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // 1. Check Schema of question_folder_items
    // We can try to insert a dummy Int ID and see if it fails, or just query information_schema if possible? 
    // Easier: Just select one row from it if exists, or check column info via rpc if we had it.
    // Actually, let's just try to fetch metadata about the table? Supabase-js doesn't expose clean describe.
    // We'll trust the error message if we try to insert an Int.

    // 2. Read Excel Exams
    const file = fs.readFileSync(path.resolve(__dirname, '../testpress_data.xlsx'));
    const wb = XLSX.read(file, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const excelExams = new Set();
    rows.forEach(r => {
        if (r['Exams']) {
            String(r['Exams']).split(',').forEach(e => excelExams.add(e.trim()));
        }
    });

    console.log(`Found ${excelExams.size} unique Exam names in Excel.`);

    // 3. Fetch Question Folders
    const { data: folders, error } = await sb.from('question_folders').select('id, name');
    if (error) {
        console.error('Error fetching folders:', error);
        return;
    }

    // 4. Match
    const folderMap = new Map();
    folders.forEach(f => folderMap.set(f.name, f.id));

    let matches = 0;
    excelExams.forEach(e => {
        if (folderMap.has(e)) {
            matches++;
            // console.log(`Match: "${e}" -> Folder ID: ${folderMap.get(e)}`);
        }
    });

    console.log(`Total Matches with Question Folders: ${matches}`);

    // 5. Check 'exams' matches too
    const { data: dbExams } = await sb.from('exams').select('id, title');
    const examMap = new Map();
    dbExams.forEach(e => examMap.set(e.title, e.id));

    let examMatches = 0;
    excelExams.forEach(e => {
        if (examMap.has(e)) {
            examMatches++;
        }
    });

    console.log(`Total Matches with Exams table: ${examMatches}`);

    // 6. Test Schema of question_folder_items (UUID vs Int)
    // We'll try to insert a fake row with string UUID question_id and Int question_id
    // Actually, we don't want to pollute DB. 
    // Let's just create a dummy RPC call or similar? No.
    // We will assume Prisma schema is correct (UUID) unless proven otherwise.
    // But wait! If we found matches in Folders, we NEED to link them.
    // And if we link them, we need to know the type.

    console.log("\n--- Checking question_folder_items table definition ---");
    // Best way without direct SQL access: Try to Select with a filter on a column that doesn't exist? No.
    // We'll rely on our previous observation of Prisma schema. 
    // But we can check if it has entries and what they look like.
    const { data: items } = await sb.from('question_folder_items').select('*').limit(1);
    if (items && items.length > 0) {
        console.log("Existing item sample:", items[0]);
    } else {
        console.log("No existing items in question_folder_items.");
    }
}

check();
