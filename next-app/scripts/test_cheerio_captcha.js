
const cheerio = require('cheerio');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

async function testCheerio() {
    try {
        console.log('Fetching Initial Page...');
        const initialRes = await fetch(TNPSC_URL);
        const html = await initialRes.text();
        const $ = cheerio.load(html);

        // 1. Extract ViewState (ASP.NET forms usually need these)
        const viewState = $('#__VIEWSTATE').val();
        const eventValidation = $('#__EVENTVALIDATION').val();
        const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();

        console.log('ViewState found:', !!viewState);

        // 2. Find Captcha
        // Puppeteer used: .captcha-question, span[id*="lblCapcha"]
        let captchaText = $('.captcha-question').text() || $('span[id*="lblCapcha"]').text() || $('span[id*="lblCaptcha"]').text();

        console.log('Raw Captcha Text:', captchaText);

        if (!captchaText) {
            console.log('❌ Captcha not found in static HTML. It might be rendered by JS.');
            return;
        }

        const numbers = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (numbers) {
            const sum = parseInt(numbers[1]) + parseInt(numbers[2]);
            console.log(`✅ Captcha Solved: ${numbers[1]} + ${numbers[2]} = ${sum}`);
        } else {
            console.log('❌ Could not parse numbers from captcha.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testCheerio();
