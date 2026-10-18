
const puppeteer = require('puppeteer');
const fs = require('fs');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';
const REG_NO = '1001006099';
const DOB = '05/07/1999';

async function captureProof() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 }); // Large viewport to capture more content
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    try {
        console.log('Navigating to TNPSC...');
        await page.goto(TNPSC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Solve Captcha
        const captchaEl = await page.waitForSelector('.captcha-question, span[id*="lblCapcha"], span[id*="lblCaptcha"]', { timeout: 10000 });
        const captchaText = await page.evaluate(el => el.textContent, captchaEl);
        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);
        console.log(`Solved Captcha: ${answer}`);

        await page.type('input[name="txtRegNo"]', REG_NO);
        await page.type('input[name="txtDOB"]', DOB);
        await page.type('input[name*="txtCaptcha"]', String(answer));

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('input[name="btnSubmit"]')
        ]);

        console.log('Result Page Loaded. Searching for Name...');

        // Inject highlight script
        const nameFound = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            if (!bodyText.includes('PRAVEEN KUMAR M')) return false;

            // Try to find the element
            // Strategy: Search all elements, find deepest containing text
            const all = document.querySelectorAll('*');
            let target = null;
            for (let el of all) {
                if (el.children.length === 0 && el.innerText.includes('PRAVEEN KUMAR M')) {
                    target = el;
                    break;
                }
            }

            if (target) {
                target.style.border = '5px solid red';
                target.style.backgroundColor = 'yellow';
                target.style.color = 'black';
                target.style.fontWeight = 'bold';
                target.scrollIntoView({ behavior: 'auto', block: 'center' });
                return true;
            }
            return false;
        });

        if (nameFound) {
            console.log('✅ Name Found and Highlighted!');
        } else {
            console.log('⚠️ Name likely hidden in text node or not found.');
        }

        await page.screenshot({ path: 'scripts/proof_vidyalakshmi.png', fullPage: false });
        console.log('Screenshot saved to scripts/proof_vidyalakshmi.png');

    } catch (error) {
        console.error('Error:', error);
    }

    await browser.close();
}

captureProof();
