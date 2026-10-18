
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

const STUDENT = {
    registration_number: '1001006099',
    dob: '05/07/1999',
    full_name: 'Praveen Kumar M' // Checking for this
};

async function deepDebug() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    try {
        console.log(`🔍 Deep Debug for: ${STUDENT.registration_number}`);
        await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Solve Captcha
        const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 10000 });
        const captchaText = await page.evaluate(el => el.textContent, captchaEl);
        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);

        await page.type('input[name="txtRegNo"]', STUDENT.registration_number);
        await page.type('input[name="txtDOB"]', STUDENT.dob);
        await page.type('input[name*="txtCaptcha"]', String(answer));

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('input[name="btnSubmit"]')
        ]);

        console.log('Page loaded. Extracting content...');

        // Save Text
        const text = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('scripts/debug_page_text.txt', text);

        // Save HTML
        const html = await page.content();
        fs.writeFileSync('scripts/debug_page_source.html', html);

        console.log('Saved page text and HTML.');

        if (text.toUpperCase().includes(STUDENT.full_name.toUpperCase())) {
            console.log(`✅ Found "${STUDENT.full_name}" in text!`);
        } else if (html.toUpperCase().includes(STUDENT.full_name.toUpperCase())) {
            console.log(`⚠️ Found "${STUDENT.full_name}" in HTML/Hidden source only!`);
        } else {
            console.log(`❌ "${STUDENT.full_name}" NOT FOUND anywhere.`);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }

    await browser.close();
}

deepDebug();
