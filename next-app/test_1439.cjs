const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/proxy-pdf?id=1439',
    method: 'GET',
    headers: {
        'x-platform': 'mobile'
    }
};

const req = http.request(options, (res) => {
    console.log('PROXY_TEST_1439_START');
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`BODY: ${body}`);
        console.log('PROXY_TEST_1439_END');
    });
});

req.on('error', (e) => console.error(e));
req.end();
