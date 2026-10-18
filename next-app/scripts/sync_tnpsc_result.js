
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';
const EXAM_TAG = 'tnpscae_2025';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use strict anon key or service role if available
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const REG_NO = process.argv[2];
const DOB = process.argv[3];

if (!REG_NO || !DOB) {
    console.error('Usage: node scripts/sync_tnpsc_result.js <RegisterNumber> <DOB:dd/mm/yyyy>');
    process.exit(1);
}

async function scrapeAndSync() {
    console.log(`[1] Starting Browser for RegNo: ${REG_NO}...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded' });

        // Solve Captcha
        const captchaEl = await page.waitForSelector('span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 60000 });
        const captchaText = await page.evaluate(el => el.textContent, captchaEl);
        console.log(`[2] Captcha Question: "${captchaText}"`);

        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (!numbers) throw new Error('Failed to parse captcha numbers');
        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);
        console.log(`    Answer: ${answer}`);

        // Fill Form
        await page.type('input[name="txtRegNo"]', REG_NO);
        await page.type('input[name="txtDOB"]', DOB);
        await page.type('input[name*="txtCaptcha"]', String(answer));

        // Submit
        console.log('[3] Submitting...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('input[name="btnSubmit"]')
        ]);

        console.log('[3] Form Submitted. Parsing results...');

        const candidateDetails = await page.evaluate(() => {
            const data = {};
            const getText = (idPart) => {
                const el = document.querySelector(`span[id*="${idPart}"]`);
                return el ? el.innerText.trim() : null;
            };

            data.name = getText('lblName');
            data.communal_category = getText('lblCommunity');

            // Find result table
            const tables = Array.from(document.querySelectorAll('table'));
            // Look for table with "Overall Rank" header
            const resultTable = tables.find(t => t.innerText.includes('Overall Rank') && t.innerText.includes('Post Name'));

            const rowsData = [];
            if (resultTable) {
                const rows = Array.from(resultTable.querySelectorAll('tr'));
                // Skip header (row 0)
                for (let i = 1; i < rows.length; i++) {
                    const cols = Array.from(rows[i].querySelectorAll('td'));
                    if (cols.length >= 4) {
                        rowsData.push({
                            post_name: cols[0].innerText.trim(),
                            paper2_marks: cols[1].innerText.trim(),
                            total_marks: cols[2].innerText.trim(),
                            overall_rank: cols[3].innerText.trim(),
                            communal_rank: cols[4] ? cols[4].innerText.trim() : '-'
                        });
                    }
                }
            }
            return { details: data, rows: rowsData };
        });

        console.log('--- Scraped Data ---');
        console.log(JSON.stringify(candidateDetails, null, 2));

        if (candidateDetails.rows.length > 0) {
            console.log('[4] Syncing to Supabase...');
            for (const row of candidateDetails.rows) {
                const payload = {
                    exam_tag: EXAM_TAG,
                    registration_number: REG_NO,
                    dob: DOB,
                    post_selected: row.post_name,
                    overall_rank: parseInt(row.overall_rank) || 0,
                    communal_rank: parseInt(row.communal_rank) || 0,
                    total_marks: parseFloat(row.total_marks) || 0,
                    paper2_marks: parseFloat(row.paper2_marks) || 0,
                    is_active: true,
                    created_at: new Date().toISOString()
                };

                const { data: existing } = await supabase
                    .from('external_exam_results')
                    .select('id')
                    .eq('registration_number', REG_NO)
                    .eq('post_selected', row.post_name)
                    .eq('exam_tag', EXAM_TAG)
                    .maybeSingle();

                if (existing) {
                    console.log(`- Updating existing record for ${row.post_name}...`);
                    await supabase.from('external_exam_results').update(payload).eq('id', existing.id);
                } else {
                    console.log(`- Inserting new record for ${row.post_name}...`);
                    await supabase.from('external_exam_results').insert(payload);
                }
            }
            console.log('✅ Sync Complete');
        } else {
            console.log('⚠️ No result rows found.');
        }

    } catch (e) {
        console.error('❌ Automation Error:', e);
    } finally {
        await browser.close();
    }
}

scrapeAndSync();
