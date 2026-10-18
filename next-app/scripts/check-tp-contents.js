const fs = require('fs');
const path = require('path');

function loadEnv(filename) {
    try {
        const envPath = path.resolve(__dirname, '..', filename);
        if (!fs.existsSync(envPath)) return;
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w_.]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, '');
            }
        });
    } catch (e) { }
}
loadEnv('.env.local');
loadEnv('.env');

async function checkChapterContents() {
    console.log('Authenticating...');
    const baseUrl = process.env.TESTPRESS_BASE_URL || 'https://maheshiesacademy.testpress.in';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    const authUrl = `${cleanBaseUrl}/api/v2.5/auth-token/`;
    const authBody = {
        username: process.env.TESTPRESS_USERNAME,
        password: process.env.TESTPRESS_PASSWORD
    };

    const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authBody)
    });

    if (!authRes.ok) {
        console.error('Auth failed:', await authRes.text());
        return;
    }

    const { token } = await authRes.json();
    const authHeader = `JWT ${token}`;
    console.log('Authenticated.');

    const courseId = 447; // Test Series (Code: 398)

    // Try fetching contents via Course endpoint
    console.log(`\nFetching Contents for Course ${courseId}...`);
    const contentsUrl = `${cleanBaseUrl}/api/v2.5/admin/courses/${courseId}/contents/`;

    // Filter by chapter 1955
    const filteredUrl = `${contentsUrl}?chapter=1955`;

    console.log(`Trying URL: ${filteredUrl}`);
    const res = await fetch(filteredUrl, { headers: { Authorization: authHeader } });

    if (res.ok) {
        const data = await res.json();
        console.log(`Contents found: ${data.count || data.length}`);
        if (data.results && data.results.length > 0) {
            console.log('\n--- First Content Item ---');
            console.log(JSON.stringify(data.results[0], null, 2));

            // Log distinct types
            const types = data.results.map(c => c.content_type || c.type || 'unknown');
            console.log('\nContent Types:', [...new Set(types)]);
        } else {
            console.log('No contents found for this chapter via filtering.');

            // Try without filter logic
            console.log('\nTrying without filter...');
            const res2 = await fetch(contentsUrl, { headers: { Authorization: authHeader } });
            if (res2.ok) {
                const data2 = await res2.json();
                console.log(`Total Course Contents: ${data2.count}`);
                if (data2.results.length > 0) {
                    console.log('first item keys:', Object.keys(data2.results[0]));
                    // Check for chapter reference in content item
                    const sample = data2.results[0];
                    console.log('Sample content chapter info:', sample.chapter, sample.chapter_url, sample.chapter_id);
                }
            }
        }
    } else {
        console.log(`Failed to fetch course contents: ${res.status}`);
        console.log(await res.text());
    }
}

checkChapterContents().catch(console.error);
