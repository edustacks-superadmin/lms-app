const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
    }
});

const baseUrl = env['TESTPRESS_BASE_URL'];
const username = env['TESTPRESS_USERNAME'];
const password = env['TESTPRESS_PASSWORD'];

async function getAuthToken() {
    console.log(`Authenticating with ${baseUrl}...`);
    return new Promise((resolve, reject) => {
        const req = https.request(`${baseUrl}/api/v2.5/auth-token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data).token);
                } else {
                    reject(`Auth Failed: ${res.statusCode} ${data}`);
                }
            });
        });
        req.write(JSON.stringify({ username, password }));
        req.end();
    });
}

function checkEndpoint(endpoint, token) {
    return new Promise((resolve) => {
        const url = `${baseUrl}${endpoint}`;
        console.log(`Checking ${url}...`);
        const req = https.request(url, {
            method: 'GET',
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        const count = json.count || (json.results ? json.results.length : 0);
                        console.log(`Found ${count} items.`);
                        if (json.results && json.results.length > 0) {
                            console.log('Sample Item:', JSON.stringify(json.results[0], null, 2));
                        } else if (Array.isArray(json) && json.length > 0) {
                            console.log('Sample Item:', JSON.stringify(json[0], null, 2));
                        }
                    } catch (e) {
                        console.log('Response is not JSON or empty.');
                    }
                } else {
                    console.log(`Error: ${data.substring(0, 100)}...`);
                }
                resolve();
            });
        });
        req.on('error', (e) => {
            console.error(e.message);
            resolve();
        });
        req.end();
    });
}

async function run() {
    try {
        const token = await getAuthToken();

        // Check additional potential endpoints
        await checkEndpoint('/api/v2.5/sets/', token);
        await checkEndpoint('/api/v2.5/admin/categories/', token);
        await checkEndpoint('/api/v2.5/categories/', token);
        await checkEndpoint('/api/v2.5/question_sets/', token);
        await checkEndpoint('/api/v2.5/admin/question_sets/', token);
        // User mentioned "GET /set" specifically
        await checkEndpoint('/api/v2.5/set/', token);

    } catch (e) {
        console.error(e);
    }
}

run();
