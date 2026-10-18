const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/testpress/sync-chapter-contents',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Triggering Chapter Contents Sync...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body if needed
req.write(JSON.stringify({}));
req.end();
