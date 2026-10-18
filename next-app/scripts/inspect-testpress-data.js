const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('https');
const fs = require('fs');

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;

    return new Promise((resolve, reject) => {
        const req = https.request(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body).token);
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

async function fetchSampleQuestion(token, questionId) {
    const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/questions/${questionId}/`;

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const data = JSON.parse(body);
                    resolve(data); // Return single object
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function inspectTestpressData() {
    try {
        console.log('🔍 Inspecting Testpress Question Data Structure\n');

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        // Fetch Question ID 1
        const sample = await fetchSampleQuestion(token, 1);
        console.log(`Fetched Question 1\n`);

        if (sample) {
            // Save to file for inspection
            fs.writeFileSync('testpress-question-sample.json', JSON.stringify(sample, null, 2));
            console.log('💾 Saved sample to testpress-question-sample.json\n');

            console.log('=== Question Fields ===');
            console.log('Keys:', Object.keys(sample).join(', '));
            console.log('\n=== Subject Info ===');
            console.log('subject:', sample.subject);
            // console.log('subject_name:', sample.subject_name); // May not exist in detail view

            console.log('\n=== Tags Info ===');
            console.log('tags:', sample.tags);

            console.log('\n=== Other Metadata ===');
            console.log('id:', sample.id);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

inspectTestpressData();
