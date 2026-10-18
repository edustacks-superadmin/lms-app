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

async function inspectSet() {
    try {
        console.log('🚀 Starting Inspect Set...');
        const token = await getTestpressToken();
        console.log('✅ Auth successful.');

        const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/?page_size=1`;
        console.log(`Fetching ${url}...`);

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                headers: { 'Authorization': `JWT ${token}` }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const data = JSON.parse(body);
                            const results = data.results || [];
                            console.log(`Found ${results.length} sets.`);
                            if (results.length > 0) {
                                console.log(`Sample Set ID: ${results[0].id}`);
                                fs.writeFileSync('testpress_set_sample.json', JSON.stringify(results[0], null, 2));
                                console.log('✅ Wrote sample to testpress_set_sample.json');
                            }
                            resolve();
                        } catch (e) {
                            console.error('JSON Parse Error');
                            reject(e);
                        }
                    } else {
                        console.error(`Fetch Failed: ${res.statusCode}`);
                        reject(new Error(`Fetch Failed: ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });

    } catch (err) {
        console.error('CRASH:', err);
    }
}

inspectSet();
