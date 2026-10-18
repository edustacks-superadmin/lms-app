const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/testpress/sync-question-sets',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        // Process the stream output
        const lines = chunk.split('\n');
        lines.forEach(line => {
            if (line.startsWith('data: ')) {
                console.log(line.replace('data: ', ''));
            }
        });
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
