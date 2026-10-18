const http = require('http');

console.log('Triggering sync API...');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/testpress/sync-chapters',
    method: 'POST',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Sync Results:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

// Set a long timeout just in case, though the request just triggers it.
// Actually default timeout is usually headers timeout.
// If the server processes synchronously, we might timeout. 
// But Vercel/Next.js dev server should handle it.
req.end();
