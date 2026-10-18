const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;
    console.log(`Authenticating with ${loginUrl}...`);

    return new Promise((resolve, reject) => {
        const req = https.request(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const data = JSON.parse(body);
                        resolve(data.token);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Auth Failed: ${res.statusCode} ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ username: TESTPRESS_USERNAME, password: TESTPRESS_PASSWORD }));
        req.end();
    });
}

async function inspectUrl() {
    try {
        const token = await getTestpressToken();
        console.log('Token acquired.');

        // The URL from the user screenshot
        const targetUrl = 'https://thapovaninstitute.testpress.in/api/v2.5/admin/chapter_contents/646/';
        console.log(`Fetching ${targetUrl}...`);

        const req = https.request(targetUrl, {
            method: 'GET',
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                try {
                    const data = JSON.parse(body);
                    console.log('--- VIDEO DATA ---');
                    if (data.video) {
                        console.log('Video URL:', data.video.url);
                        console.log('Embed Code:', data.video.embed_code);
                        if (data.video.transcoded_video) {
                            console.log('Transcoded URL:', data.video.transcoded_video.url);
                            console.log('Transcoded Format:', data.video.transcoded_video.format);
                        }
                    } else {
                        console.log('No video object found.');
                        console.log('Keys:', Object.keys(data));
                    }
                    console.log('---------------------');
                } catch (e) {
                    console.log('Body:', body);
                }
            });
        });

        req.on('error', (e) => console.error(e));
        req.end();

    } catch (e) {
        console.error('Error:', e);
    }
}

inspectUrl();
