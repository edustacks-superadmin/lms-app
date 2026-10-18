
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';
const AUDIT_DATA = 'scripts/audit_students.json';
const OUTPUT_CSV = 'scripts/tnpsc_name_audit.csv';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAudit() {
    if (!fs.existsSync(AUDIT_DATA)) {
        console.error('Audit data not found!');
        return;
    }

    const students = JSON.parse(fs.readFileSync(AUDIT_DATA, 'utf-8'));
    console.log(`🚀 Starting Global Audit for ${students.length} students...`);

    // Initialize CSV with headers
    fs.writeFileSync(OUTPUT_CSV, 'Registration Number,Database Name,Official Portal Name,Status\n', 'utf-8');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const { registration_number, dob, full_name } = student;
        console.log(`\n[${i + 1}/${students.length}] Verifying: ${full_name} (${registration_number})`);

        let officialName = 'ERROR';
        let status = 'FAILED';

        try {
            await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Solve Captcha
            let captchaText = null;
            try {
                const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 10000 });
                captchaText = await page.evaluate(el => el.textContent, captchaEl);
            } catch (e) {
                const bodyText = await page.evaluate(() => document.body.innerText);
                const match = bodyText.match(/What is (\d+) \+ (\d+) \?/);
                if (match) captchaText = match[0];
            }

            if (!captchaText) throw new Error('Captcha not found');

            const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
            const answer = parseInt(numbers[1]) + parseInt(numbers[2]);

            // Fill Form
            // Convert YYYY-MM-DD to DD/MM/YYYY
            let formattedDob = dob;
            if (dob.includes('-')) {
                const [y, m, d] = dob.split('-');
                formattedDob = `${d}/${m}/${y}`;
            }

            await page.type('input[name="txtRegNo"]', registration_number);
            await page.type('input[name="txtDOB"]', formattedDob);
            await page.type('input[name*="txtCaptcha"]', String(answer));

            // Submit
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                page.click('input[name="btnSubmit"]')
            ]);

            // Extract Name and Verification Status
            const resultData = await page.evaluate((regNo) => {
                const tables = Array.from(document.querySelectorAll('table'));
                const infoTable = tables.find(t => t.innerText.includes('REGISTER NUMBER'));

                if (infoTable) {
                    const tds = Array.from(infoTable.querySelectorAll('td'));
                    const regNoTd = tds.find(t => t.innerText && t.innerText.trim() === regNo);

                    if (regNoTd) {
                        const nameIdx = tds.findIndex(td => td.innerText && td.innerText.includes('NAME'));
                        return {
                            found: true,
                            name: nameIdx !== -1 ? tds[nameIdx + 1]?.innerText.trim() : 'NAME_HIDDEN'
                        };
                    }
                }
                return { found: false, name: null };
            }, registration_number);

            if (!resultData.found) {
                status = 'INVALID_CREDS';
                console.log('    ⚠️  Invalid Credentials or No Result Found');
            } else {
                officialName = resultData.name;
                if (officialName === 'NAME_HIDDEN') {
                    status = 'VERIFIED_NO_NAME';
                    console.log('    ✅ Result Found (Name Hidden on Portal)');
                } else {
                    const isMatch = officialName.toUpperCase() === full_name.toUpperCase().trim();
                    status = isMatch ? 'MATCH' : 'MISMATCH';
                    console.log(`    ✅ Official Name: ${officialName} [${status}]`);
                }
            }

        } catch (error) {
            console.error(`    ❌ Error: ${error.message}`);
            status = 'ERROR';
        }

        // Append to CSV
        const csvLine = `"${registration_number}","${full_name}","${officialName}","${status}"\n`;
        fs.appendFileSync(OUTPUT_CSV, csvLine);

        // Small delay between requests
        await delay(1000);
    }

    await browser.close();
    console.log(`\n✅ Audit Complete! Results saved to ${OUTPUT_CSV}`);
}

runAudit();
