
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

const INPUT_JSON = process.argv[2];
const OUTPUT_CSV = process.argv[3];
const WORKER_ID = process.argv[4] || 'W?';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAudit() {
    if (!fs.existsSync(INPUT_JSON)) return;

    const students = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf-8'));
    console.log(`[${WORKER_ID}] Starting Audit for ${students.length} students...`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const { registration_number, dob, full_name } = student;
        // console.log(`[${WORKER_ID}] [${i + 1}/${students.length}] Verifying: ${registration_number}`);

        let officialName = 'ERROR';
        let status = 'FAILED';

        try {
            await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

            let captchaText = null;
            try {
                const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 8000 });
                captchaText = await page.evaluate(el => el.textContent, captchaEl);
            } catch (e) {
                const bodyText = await page.evaluate(() => document.body.innerText);
                const match = bodyText.match(/What is (\d+) \+ (\d+) \?/);
                if (match) captchaText = match[0];
            }

            if (!captchaText) throw new Error('Captcha not found');

            const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
            const answer = parseInt(numbers[1]) + parseInt(numbers[2]);

            let formattedDob = dob;
            if (dob.includes('-')) {
                const [y, m, d] = dob.split('-');
                formattedDob = `${d}/${m}/${y}`;
            }

            await page.type('input[name="txtRegNo"]', registration_number);
            await page.type('input[name="txtDOB"]', formattedDob);
            await page.type('input[name*="txtCaptcha"]', String(answer));

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                page.click('input[name="btnSubmit"]')
            ]);

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
            } else {
                officialName = resultData.name;
                if (officialName === 'NAME_HIDDEN') {
                    status = 'VERIFIED_NO_NAME';
                } else {
                    const isMatch = officialName.toUpperCase() === full_name.toUpperCase().trim();
                    status = isMatch ? 'MATCH' : 'MISMATCH';
                }
            }

        } catch (error) {
            status = 'ERROR';
        }

        const csvLine = `"${registration_number}","${full_name}","${officialName}","${status}"\n`;
        fs.appendFileSync(OUTPUT_CSV, csvLine);

        if (status === 'VERIFIED_NO_NAME' || status === 'MATCH') {
            console.log(`[${WORKER_ID}] ✅ ${registration_number}: ${status}`);
        } else {
            console.log(`[${WORKER_ID}] ⚠️  ${registration_number}: ${status}`);
        }

        await delay(500);
    }

    await browser.close();
    console.log(`[${WORKER_ID}] DONE`);
}

runAudit();
