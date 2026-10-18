
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

// Ageshwaran N - Known Valid Record that failed
const STUDENT = {
    registration_number: '1001016189',
    dob: '2001-08-06', // 6th August 2001
    full_name: 'Ageshwaran N'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function debugAudit() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    console.log(`🔍 Debugging for: ${STUDENT.full_name} (${STUDENT.registration_number})`);

    try {
        await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Solve Captcha
        const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 10000 });
        const captchaText = await page.evaluate(el => el.textContent, captchaEl);
        console.log(`    🧩 Captcha Text: ${captchaText}`);

        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);
        console.log(`    🔢 Solved: ${answer}`);

        // DOB Formatting check
        // Format YYYY-MM-DD -> DD/MM/YYYY
        let formattedDob = STUDENT.dob;
        if (STUDENT.dob.includes('-')) {
            const [y, m, d] = STUDENT.dob.split('-');
            formattedDob = `${d}/${m}/${y}`;
        }
        console.log(`    📅 Original DOB: ${STUDENT.dob} -> Formatted: ${formattedDob}`);

        await page.type('input[name="txtRegNo"]', STUDENT.registration_number);
        await page.type('input[name="txtDOB"]', formattedDob);
        await page.type('input[name*="txtCaptcha"]', String(answer));

        // Take screenshot before submit
        await page.screenshot({ path: 'debug_filled_form.png', fullPage: true });

        // Submit
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('input[name="btnSubmit"]')
        ]);

        // Take screenshot after submit
        await page.screenshot({ path: 'debug_result_page.png', fullPage: true });

        // Check if name exists
        const html = await page.content();
        if (html.includes(STUDENT.full_name.toUpperCase())) {
            console.log('    ✅ Success: Name found in page source!');
        } else {
            console.log('    ❌ Failure: Name NOT found in page source.');
            // Check for error text
            if (html.includes('Invalid Registration Number')) console.log('    ⚠️ Error: Invalid Registration Number msg found');
            if (html.includes('Invalid Date of Birth')) console.log('    ⚠️ Error: Invalid Date of Birth msg found');
            if (html.includes('Incorrect Captcha')) console.log('    ⚠️ Error: Incorrect Captcha msg found');
        }

    } catch (error) {
        console.error(`    ❌ Script Error: ${error.message}`);
        await page.screenshot({ path: 'debug_error.png', fullPage: true });
    }

    await browser.close();
}

debugAudit();
