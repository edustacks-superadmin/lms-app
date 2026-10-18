const https = require('https');

const url = 'https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev/avatars/11394.png'; // One of the files from the screenshot

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('Total Size:', buffer.length);
        console.log('First 50 chars (String):', buffer.toString('utf8', 0, 50));
        console.log('First 20 bytes (Hex):', buffer.toString('hex', 0, 20));
    });
}).on('error', (e) => {
    console.error(e);
});
