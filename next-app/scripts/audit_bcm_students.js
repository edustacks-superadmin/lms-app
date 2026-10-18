
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function solveCaptcha(page) {
    try {
        const captchaEl = await page.waitForSelector('span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 10000 });
        const captchaText = await page.evaluate(el => el.textContent, captchaEl);
        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (!numbers) throw new Error('Failed to parse captcha numbers');
        return parseInt(numbers[1]) + parseInt(numbers[2]);
    } catch (e) {
        return null;
    }
}

async function auditBCMStudents() {
    console.log('🔍 Starting BCM Audit...');

    // 1. Fetch all distinct students marked as BCM
    const { data: students, error } = await supabase
        .from('external_exam_results')
        .select('registration_number, dob')
        .eq('community', 'BCM')
        // We only need each student once, so we'll use a unique Set after fetching
        // But Postgres select distinct is better if possible, or just process them in JS
        .limit(1000);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    // Deduplicate by RegNo
    const uniqueStudents = [];
    const seen = new Set();
    for (const s of students) {
        if (!seen.has(s.registration_number)) {
            seen.add(s.registration_number);
            uniqueStudents.push(s);
        }
    }

    console.log(`Found ${uniqueStudents.length} unique students marked as BCM to check.`);

    if (uniqueStudents.length === 0) {
        console.log('No BCM students found. Exiting.');
        return;
    }

    const browser = await puppeteer.launch({
        headless: true, // Set to false if you want to watch
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    let fixedCount = 0;
    let confirmedBCMCount = 0;
    let failedCount = 0;

    for (const student of uniqueStudents) {
        const { registration_number, dob } = student;
        console.log(`\nChecking ${registration_number}...`);

        try {
            await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded' });

            const answer = await solveCaptcha(page);
            if (answer === null) {
                console.log('⚠️ Could not solve captcha. Retrying once...');
                await page.reload();
                const retryAns = await solveCaptcha(page);
                if (retryAns === null) {
                    throw new Error('Captcha failed twice');
                }
            }

            // Re-get answer if we reloaded
            const finalAnswer = await page.evaluate(() => {
                const el = document.querySelector('span[id*="lblCapcha"], span[id*="lblCaptcha"]');
                if (!el) return null;
                const text = el.textContent;
                const numbers = text.match(/(\d+)\s*\+\s*(\d+)/);
                return numbers ? parseInt(numbers[1]) + parseInt(numbers[2]) : null;
            });

            if (!finalAnswer) throw new Error("Captcha logic error");

            await page.type('input[name="txtRegNo"]', registration_number);
            await page.type('input[name="txtDOB"]', dob); // Ensure format is dd/mm/yyyy in DB?
            await page.type('input[name*="txtCaptcha"]', String(finalAnswer));

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
                page.click('input[name="btnSubmit"]')
            ]);

            // Check if we are on result page
            const communityText = await page.evaluate(() => {
                const el = document.querySelector('span[id*="lblCommunity"]');
                return el ? el.innerText.trim() : null;
            });

            if (!communityText) {
                // Identify invalid login/result not found
                const errorMsg = await page.evaluate(() => {
                    const el = document.querySelector('#lblMessage'); // Approximate ID for error
                    return el ? el.innerText : null;
                });
                console.log(`⚠️ No result found or error: ${errorMsg || 'Unknown'}`);
                failedCount++;
                continue;
            }

            console.log(`- Official Community: "${communityText}"`);

            if (communityText.includes('BC(OBCM)') || communityText.includes('BC (OBCM)')) {
                console.log('🚨 Mismatch Found! DB: BCM -> Official: BC(OBCM). Fixing...');

                // Update DB for ALL entries of this student
                const { error: updateError } = await supabase
                    .from('external_exam_results')
                    .update({ community: 'BC' })
                    .eq('registration_number', registration_number);

                if (updateError) {
                    console.error('❌ DB Update Failed:', updateError);
                } else {
                    console.log('✅ Fixed in DB.');
                    fixedCount++;
                }
            } else {
                console.log('✅ Confirmed BCM.');
                confirmedBCMCount++;
            }

        } catch (e) {
            console.error(`❌ Error processing ${registration_number}:`, e.message);
            failedCount++;
        }

        // Be nice to the server
        await wait(2000);
    }

    await browser.close();

    console.log('\n--- Audit Complete ---');
    console.log(`Fixed (Changed to BC): ${fixedCount}`);
    console.log(`Confirmed BCM: ${confirmedBCMCount}`);
    console.log(`Failed/Skipped: ${failedCount}`);
}

auditBCMStudents();
