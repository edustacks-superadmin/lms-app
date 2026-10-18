const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/cart',
    method: 'GET',
};

console.log('Testing connectivity to http://127.0.0.1:3000/api/cart...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
