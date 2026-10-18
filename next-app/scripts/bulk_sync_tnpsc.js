
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';
const EXAM_TAG = 'TNPSC_AE_2025';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_FILE = process.argv[2] || 'scripts/tnpsc_students.csv';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processStudent(page, student) {
    const { registration_number, dob, email, full_name, whatsapp_number } = student;
    console.log(`\n🔹 Processing: ${full_name} (${registration_number}) - DOB: ${dob}`);

    try {
        await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Solve Captcha
        await page.waitForSelector('body', { timeout: 60000 });
        await page.evaluate(() => {
            document.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
        });

        let captchaText = null;
        try {
            const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 5000 });
            captchaText = await page.evaluate(el => el.textContent, captchaEl);
        } catch (e) {
            const bodyText = await page.evaluate(() => document.body.innerText);
            const match = bodyText.match(/What is (\d+) \+ (\d+) \?/);
            if (match) captchaText = match[0];
        }

        if (!captchaText) throw new Error('Could not find captcha text on page');

        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (!numbers) throw new Error('Failed to parse captcha numbers');
        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);

        // Fill Form
        await page.type('input[name="txtRegNo"]', registration_number);
        await page.type('input[name="txtDOB"]', dob);
        await page.type('input[name*="txtCaptcha"]', String(answer));

        // Submit
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('input[name="btnSubmit"]')
        ]);

        // Parse Results (Positional Matching)
        const candidateDetails = await page.evaluate((regNo) => {
            const data = { rows: [] };
            const tables = Array.from(document.querySelectorAll('table'));

            // 1. Info Table (Positional)
            const infoTable = tables.find(t => t.innerText.includes('REGISTER NUMBER'));
            if (infoTable) {
                const tds = Array.from(infoTable.querySelectorAll('td'));

                // Helper to find text after a label
                const findValueFor = (label) => {
                    const idx = tds.findIndex(td => td.innerText && td.innerText.includes(label));
                    return idx !== -1 ? tds[idx + 1]?.innerText.trim() : null;
                };

                data.official_name = findValueFor('NAME');

                const regNoTd = tds.find(t => t.innerText && t.innerText.trim() === regNo);
                if (regNoTd) {
                    const rowTds = Array.from(regNoTd.parentElement.querySelectorAll('td'));
                    const idx = rowTds.indexOf(regNoTd);
                    if (idx !== -1) {
                        data.paper1_part_a = rowTds[idx + 1]?.innerText.trim();
                        data.paper1_part_b = rowTds[idx + 2]?.innerText.trim();
                        data.communal_category = rowTds[idx + 3]?.innerText.trim();
                        data.gender = rowTds[idx + 4]?.innerText.trim();
                        data.pstm = rowTds[idx + 5]?.innerText.trim();
                    }
                }
            }

            // 2. Rank Table (Look for Sl No and POST NAME)
            const rankTable = tables.find(t => t.innerText.includes('Sl No') || t.innerText.includes('RANK POSITION'));
            if (rankTable) {
                const trs = Array.from(rankTable.querySelectorAll('tr'));
                for (const tr of trs) {
                    const tds = Array.from(tr.querySelectorAll('td'));
                    if (tds.length >= 6) {
                        const firstCol = tds[0].innerText.trim();
                        if (/^\d+$/.test(firstCol)) {
                            data.rows.push({
                                post_name: tds[1].innerText.trim(),
                                paper2_marks: tds[2].innerText.trim(),
                                total_marks: tds[3].innerText.trim(),
                                overall_rank: tds[4].innerText.trim(),
                                communal_rank: tds[5]?.innerText.trim() || '-'
                            });
                        }
                    }
                }
            }
            return data;
        }, registration_number);

        if (candidateDetails && candidateDetails.rows.length > 0) {
            console.log(`    ✅ Found ${candidateDetails.rows.length} results.`);

            for (const row of candidateDetails.rows) {
                let memberId = null;
                if (email) {
                    const { data: member, error: memberError } = await supabase.from('members').select('id').eq('email', email).maybeSingle();
                    if (memberError) console.error(`    ❌ Member lookup error: ${memberError.message}`);
                    if (member) memberId = member.id;
                }

                // Convert DD/MM/YYYY to YYYY-MM-DD
                let formattedDob = dob;
                if (dob && dob.includes('/')) {
                    const [d, m, y] = dob.split('/');
                    formattedDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }

                const payload = {
                    exam_tag: EXAM_TAG,
                    registration_number: registration_number,
                    dob: formattedDob,
                    post_selected: row.post_name,
                    overall_rank: parseInt(row.overall_rank) || 0,
                    communal_rank: parseInt(row.communal_rank) || 0,
                    total_marks: parseFloat(row.total_marks) || 0,
                    paper2_marks: parseFloat(row.paper2_marks) || 0,
                    paper1_part_a: parseFloat(candidateDetails.paper1_part_a) || 0,
                    paper1_part_b: parseFloat(candidateDetails.paper1_part_b) || 0,
                    community: candidateDetails.communal_category || 'GT',
                    gender: candidateDetails.gender || 'MALE',
                    department: 'CIVIL',
                    full_name: candidateDetails.official_name || full_name, // Use official name if found
                    email: email,
                    whatsapp_number: whatsapp_number,
                    member_id: memberId,
                    institute_id: 10,
                    is_active: true,
                    is_verified: true,
                    created_at: new Date().toISOString()
                };

                if (candidateDetails.official_name && candidateDetails.official_name.toUpperCase() !== full_name.toUpperCase()) {
                    console.log(`    ⚠️  Name Mismatch! Official: ${candidateDetails.official_name} vs Provided: ${full_name}`);
                }

                const { data: existing, error: findError } = await supabase
                    .from('external_exam_results')
                    .select('id')
                    .eq('registration_number', registration_number)
                    .eq('post_selected', row.post_name)
                    .eq('exam_tag', EXAM_TAG)
                    .maybeSingle();

                if (findError) {
                    console.error(`    ❌ Error finding existing record: ${findError.message}`);
                }

                if (existing) {
                    const { error: updateError } = await supabase.from('external_exam_results').update(payload).eq('id', existing.id);
                    if (updateError) {
                        console.error(`    ❌ Update error: ${updateError.message}`);
                    } else {
                        console.log(`    ✅ Updated result for ${row.post_name}`);
                    }
                } else {
                    const { error: insertError } = await supabase.from('external_exam_results').insert(payload);
                    if (insertError) {
                        console.error(`    ❌ Insert error: ${insertError.message}`);
                    } else {
                        console.log(`    ✅ Inserted result for ${row.post_name}`);
                    }
                }
            }
            return true;
        } else {
            console.log('    ⚠️  No result rows found.');
            const html = await page.content();
            fs.writeFileSync(`empty_result_${registration_number}.html`, html);
            return false;
        }

    } catch (e) {
        console.error(`    ❌ Error: ${e.message}`);
        try {
            const html = await page.content();
            fs.writeFileSync(`error_${registration_number}.html`, html);
            await page.screenshot({ path: `error_${registration_number}.png` });
        } catch (err) { }
        return false;
    }
}

async function bulkRun() {
    const students = [];
    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = fileContent.split('\n').filter(l => l.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
            const student = {};
            headers.forEach((h, idx) => student[h] = values[idx]);
            students.push(student);
        }
    }

    console.log(`Loaded ${students.length} students from CSV.`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let successCount = 0;
    for (const student of students) {
        const success = await processStudent(page, student);
        if (success) successCount++;
        await delay(5000);
    }

    console.log(`\n=== Batch Complete ===\nTotal: ${students.length}\nSuccess: ${successCount}`);
    await browser.close();
}

bulkRun();
