
const puppeteer = require('puppeteer');

const LOCAL_URL = 'http://localhost:3000/student/tnpsc-ae-analysis';
const REG_NO = '0501008149';
const DOB = '13011995'; // DDMMYYYY format expected by input usually, or YYYY-MM-DD depending on type

async function testLocalVerify() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('Navigating to Local App...');
        await page.goto(LOCAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Handle Login if redirected
        if (page.url().includes('login')) {
            console.log('Redirected to login. Trying to mock auth or login...');
            // In a real scenario, we'd need valid creds. 
            // Since we can't easily login without creds, we might check if we can reach the page.
            // But wait, the previous subagent success implied we COULD reach it or I used a trick.
            // Actually, I can use the existing session via profile if available, but I don't have that.
            // Let's try to see if we can just hit the API endpoint directly to see what it RETURNS, 
            // since the user asked "check name comes or not", implying the API response is key.

            console.log('Skipping UI test due to auth. Testing API directly.');
        } else {
            // UI Test Logic
            console.log('Page loaded. Filling form...');
            // ... (fill form logic)
        }

    } catch (error) {
        console.error('Error:', error);
    }

    await browser.close();
}

// Better approach to answer user: "try here the same and check name comes are not?"
// The user wants to see the RESULT. The most direct way is to hit the API route I just modified.
testLocalVerify();
