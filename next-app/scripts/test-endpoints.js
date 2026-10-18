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
    console.log('🔐 Authenticating...');

    return new Promise((resolve, reject) => {
        const req = https.request(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const data = JSON.parse(body);
                    resolve(data.token);
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

async function testEndpoint(token, url, filename) {
    console.log(`\n📥 Testing: ${url}`);

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);

                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(body);
                        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
                        console.log(`   ✅ Saved to: ${filename}`);

                        const results = data.results || [];
                        if (results.length > 0) {
                            console.log(`   📊 Sample keys: ${Object.keys(results[0]).join(', ')}`);
                            console.log(`   🔑 Has 'id': ${results[0].hasOwnProperty('id')}`);
                            if (results[0].id !== undefined) {
                                console.log(`   ✨ FOUND ID: ${results[0].id}`);
                            }
                        }
                        resolve({ success: true, data });
                    } catch (e) {
                        console.error(`   ❌ JSON Parse Error`);
                        reject(e);
                    }
                } else {
                    console.error(`   ❌ Failed: ${res.statusCode}`);
                    console.error(`   Body: ${body.substring(0, 200)}`);
                    resolve({ success: false, status: res.statusCode });
                }
            });
        });
        req.on('error', (e) => {
            console.error(`   ❌ Request Error: ${e.message}`);
            reject(e);
        });
        req.end();
    });
}

async function run() {
    try {
        console.log('🚀 Testing Alternative Question Endpoints\n');

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        console.log('='.repeat(60));
        console.log('ENDPOINT TESTS');
        console.log('='.repeat(60));

        // Test 1: Direct admin/questions endpoint
        await testEndpoint(
            token,
            `${TESTPRESS_BASE_URL}/api/v2.5/admin/questions/?page_size=5`,
            'endpoint_test_admin_questions.json'
        );

        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 2: Original nested endpoint for comparison
        await testEndpoint(
            token,
            `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/2491/questions/?page_size=5`,
            'endpoint_test_nested_questions.json'
        );

        console.log('\n' + '='.repeat(60));
        console.log('✅ Tests Complete!');
        console.log('='.repeat(60));
        console.log('\n📝 Review the generated JSON files to compare structures.');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

run();
