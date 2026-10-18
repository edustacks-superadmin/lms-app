const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const https = require('https');

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;
    console.log(`Authenticating...`);

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
                    reject(new Error(`Auth Failed: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({ username: TESTPRESS_USERNAME, password: TESTPRESS_PASSWORD }));
        req.end();
    });
}

async function fetchOneQuestion() {
    try {
        console.log('Starting fetch...');
        const token = await getTestpressToken();
        console.log('Auth OK');

        // Try /admin/questions/ endpoint
        const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/questions/?page=1&page_size=1`;
        console.log(`Trying: ${url}`);

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                headers: { 'Authorization': `JWT ${token}` }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`Response Status: ${res.statusCode}`);

                    if (res.statusCode === 200) {
                        try {
                            const data = JSON.parse(body);
                            const results = data.results || [];
                            console.log(`Found ${results.length} questions.`);

                            if (results.length > 0) {
                                console.log(`Sample Question ID: ${results[0].id}`);
                                fs.writeFileSync('testpress_question_sample.json', JSON.stringify(results[0], null, 2));
                                console.log('SUCCESS: Wrote to testpress_question_sample.json');
                            } else {
                                console.log('No questions in results');
                            }
                            resolve();
                        } catch (e) {
                            console.error('JSON Parse Error:', e.message);
                            reject(e);
                        }
                    } else {
                        console.error(`Failed with ${res.statusCode}`);
                        console.error('Response body:', body.substring(0, 500));
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });
            req.on('error', (e) => {
                console.error('Request Error:', e.message);
                reject(e);
            });
            req.end();
        });

    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

fetchOneQuestion();
