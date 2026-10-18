const http = require('http');

const options = {
    hostname: '192.168.1.19',
    port: 3000,
    path: '/api/proxy-pdf?id=1439&platform=mobile',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log('PROXY_TEST_FINAL_URL_START');
    console.log(`STATUS: ${res.statusCode}`);
    console.log('PROXY_TEST_FINAL_URL_END');
});

req.on('error', (e) => console.error(e));
req.end();
