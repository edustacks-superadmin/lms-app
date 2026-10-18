const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/testpress/sync-exams',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Triggering Exams Sync...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk.substring(0, 200)}...`); // Log only start of body
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({}));
req.end();
