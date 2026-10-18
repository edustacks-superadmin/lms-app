
const cheerio = require('cheerio');

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';

async function debugSession() {
    try {
        console.log('1. Initial GET...');
        const initialRes = await fetch(TNPSC_URL);

        // Log Headers to see Cookies
        const cookies = initialRes.headers.get('set-cookie');
        console.log('   Cookies Received:', cookies);

        const html = await initialRes.text();
        const $ = cheerio.load(html);

        const viewState = $('#__VIEWSTATE').val();
        const eventValidation = $('#__EVENTVALIDATION').val();
        const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();

        console.log('   ViewState present:', !!viewState);

        // Dump all inputs to find missing ones
        console.log('   --- FORM INPUTS ---');
        $('input').each((i, el) => {
            console.log(`   ${$(el).attr('name')} = ${$(el).val()}`);
        });
        console.log('   -------------------');

        // Solve Captcha
        let captchaText = $('.captcha-question').text() || $('span[id*="lblCapcha"]').text() || $('span[id*="lblCaptcha"]').text();
        console.log('   Captcha Text:', captchaText);

        let answer = '';
        const match = captchaText?.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
            answer = String(parseInt(match[1]) + parseInt(match[2]));
            console.log('   Solved:', answer);
        } else {
            console.log('   ❌ Failed to solve captcha');
            return;
        }

        // 2. Submit Form
        const formData = new URLSearchParams();
        if (viewState) formData.append('__VIEWSTATE', viewState);
        if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);
        if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);

        formData.append('txtRegNo', '0501008149'); // Valid test ID
        formData.append('txtDOB', '13/01/1995');
        formData.append('txtCaptchaAnswer', answer); // CORRECT NAME FOUND
        formData.append('btnSubmit', 'Submit');

        // Parse cookie to send only key=value
        const rawCookie = initialRes.headers.get('set-cookie');
        let cookieToSend = '';
        if (rawCookie) {
            cookieToSend = rawCookie.split(';')[0]; // Get the first part (ASP.NET_SessionId=...)
        }
        console.log('   Cookie to Send:', cookieToSend);

        console.log('2. sending POST with Cookie...');
        const resultRes = await fetch(TNPSC_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': TNPSC_URL,
                'Cookie': cookieToSend // Cleaned cookie
            }
        });

        const resultHtml = await resultRes.text();
        const $res = cheerio.load(resultHtml);

        // Check finding
        const infoTable = $res('table').filter((i, el) => $res(el).text().includes('REGISTER NUMBER')).first();
        if (infoTable.length > 0) {
            console.log('✅ SUCCESS! Result Table Found.');
        } else {
            console.log('❌ FAILURE. Result not found.');
            // Dump error if any
            const err = $res('span[id*="lblError"]').text();
            console.log('   Page Error:', err);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

debugSession();
