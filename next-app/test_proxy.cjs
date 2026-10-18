const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/proxy-pdf?id=9',
    method: 'GET',
    headers: {
        'x-platform': 'mobile'
    }
};

const req = http.request(options, (res) => {
    console.log('PROXY_TEST_START');
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

    let bodyChunks = [];
    res.on('data', (chunk) => {
        bodyChunks.push(chunk);
    });

    res.on('end', () => {
        const totalLength = bodyChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        console.log(`TOTAL_BODY_LENGTH: ${totalLength}`);

        if (res.statusCode === 200 && res.headers['content-type'] === 'application/pdf') {
            console.log('SUCCESS: Proxy is working and returning PDF content.');
        } else {
            console.log('FAILURE: Proxy returned unexpected response.');
        }
        console.log('PROXY_TEST_END');
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
