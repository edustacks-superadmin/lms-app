
const cheerio = require('cheerio');
const fs = require('fs');

// Configuration
const BASE_URL = 'https://tnpscresults.tn.gov.in/resultnoninterview/cts-index.aspx?token=P9X2R7K5A8';
const REG_NO = process.argv[2];
const DOB = process.argv[3];

if (!REG_NO || !DOB) {
    console.error('Usage: node scripts/test_tnpsc_fetch.js <RegisterNumber> <DOB:dd/mm/yyyy>');
    process.exit(1);
}

async function fetchResults() {
    console.log(`[1] Fetching initial page: ${BASE_URL}`);

    try {
        const initialResponse = await fetch(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!initialResponse.ok) {
            throw new Error(`Failed to load page: ${initialResponse.status} ${initialResponse.statusText}`);
        }

        // Log Cookies
        const cookies = initialResponse.headers.get('set-cookie');
        console.log(`[1] Cookies received: ${cookies || 'NONE'}`);

        const html = await initialResponse.text();
        const $ = cheerio.load(html);

        // Debug: Log all inputs
        console.log('[DEBUG] Form Inputs Found:');
        $('input').each((i, el) => {
            console.log(`    - Name: ${$(el).attr('name')}, ID: ${$(el).attr('id')}, Value: ${$(el).val() ? ($(el).val().length > 20 ? $(el).val().substring(0, 20) + '...' : $(el).val()) : 'null'}`);
        });

        // Debug: Log usage of form action
        const formAction = $('form').attr('action');
        console.log(`[DEBUG] Form properties: action='${formAction}', method='${$('form').attr('method')}'`);

        const viewState = $('#__VIEWSTATE').val();
        const eventValidation = $('#__EVENTVALIDATION').val();
        const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();

        if (!viewState || !eventValidation) {
            throw new Error('Could not find __VIEWSTATE or __EVENTVALIDATION');
        }

        // Solve Captcha
        let captchaLabel = $('span[id*="lblCapcha"], span[id*="lblCaptcha"]').text();
        if (!captchaLabel) captchaLabel = $('*:contains("What is")').last().text();

        console.log(`[3] Found Captcha Text: "${captchaLabel ? captchaLabel.trim() : 'NULL'}"`);
        if (!captchaLabel) throw new Error('Could not find captcha label.');

        const numbers = captchaLabel.match(/(\d+)\s*\+\s*(\d+)/);
        if (!numbers) throw new Error(`Could not extract numbers from captcha text: "${captchaLabel}"`);

        const answer = parseInt(numbers[1]) + parseInt(numbers[2]);
        console.log(`    - Solved: ${numbers[1]} + ${numbers[2]} = ${answer}`);

        // Prepare Form Data
        const formData = new URLSearchParams();
        formData.append('__VIEWSTATE', viewState);
        formData.append('__EVENTVALIDATION', eventValidation);
        if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);

        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('txtRegNo', REG_NO);
        formData.append('txtDOB', DOB);
        formData.append('txtCaptchaAnswer', answer);
        formData.append('btnSubmit', 'Submit');

        // Process Cookies
        let cookieHeader = '';
        const setCookieHeader = initialResponse.headers.get('set-cookie');
        if (setCookieHeader) {
            let rawCookies = [];
            if (typeof initialResponse.headers.getSetCookie === 'function') {
                rawCookies = initialResponse.headers.getSetCookie();
            } else {
                rawCookies = [setCookieHeader];
            }
            cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');
        }
        console.log(`[4] Prepared Cookie Header: "${cookieHeader}"`);

        console.log(`[4] Submitting Form...`);

        const postResponse = await fetch(BASE_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookieHeader,
                'Origin': 'https://tnpscresults.tn.gov.in',
                'Referer': BASE_URL,
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const resultHtml = await postResponse.text();
        const $result = cheerio.load(resultHtml);

        fs.writeFileSync('debug_tnpsc_response.html', resultHtml);
        console.log('[DEBUG] Saved response to debug_tnpsc_response.html');

        const dialogText = $result('.dialog').text().trim();
        const h1Text = $result('h1').text().trim();

        console.log(`[RESULT PARSE] Dialog: "${dialogText.replace(/\s+/g, ' ')}"`);
        console.log(`[RESULT PARSE] H1: "${h1Text}"`);

        const errorMsg = $result('span[id*="lblError"], span[id*="lblMessage"]').text();
        if (errorMsg) console.log(`[RESULT] Message: "${errorMsg.trim()}"`);

        const studentName = $result('span[id*="lblName"]').text() || $result('td:contains("Name")').next().text();
        const totalMarks = $result('span[id*="lblTotalMarks"]').text() || $result('td:contains("Total Marks")').next().text();

        if (studentName || totalMarks) {
            console.log('\n✅ SUCCESS! Result Found:');
            console.log(`Name: ${studentName.trim()}`);
            console.log(`Marks: ${totalMarks.trim()}`);
        } else {
            console.log('\n⚠️  Result not found in parsed HTML.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fetchResults();
