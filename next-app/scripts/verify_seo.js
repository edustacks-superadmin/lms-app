
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/posts/tnpsc-annual-planner-2026-out-check-exam-dates-for-group-1-2-4-technical-posts-0zve',
    method: 'GET',
    headers: {
        'Host': 'maheshiesacademy.localhost:3000'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {

        // Log head to see what's there
        console.log(`HEAD CONTENT: ${data.substring(0, 2000)}`);

        const titleMatch = data.match(/<title>([^<]*)<\/title>/i);
        const h1Count = (data.match(/<h1/g) || []).length;

        // Robust meta tag matching (handles attributes in different orders)
        const descriptionMatch = data.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
            data.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);

        const canonicalMatch = data.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i) ||
            data.match(/<link[^>]*href="([^"]*)"[^>]*rel="canonical"[^>]*>/i);

        const robotsMatch = data.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"[^>]*>/i) ||
            data.match(/<meta[^>]*content="([^"]*)"[^>]*name="robots"[^>]*>/i);

        const schemaMatch = data.match(/"@type"\s*:\s*"BlogPosting"/);

        console.log('--- SEO Verification Results ---');
        console.log(`Page Title: ${titleMatch ? titleMatch[1] : 'Not Found'}`);
        console.log(`H1 Tag Count: ${h1Count}`);

        if (descriptionMatch) {
            console.log(`Meta Description: ${descriptionMatch[1]}`);
            console.log(`Description Length: ${descriptionMatch[1].length} chars`);
        } else {
            console.log('Meta Description: Not found');
        }

        if (robotsMatch) {
            console.log(`Robots Tag: ${robotsMatch[1]}`);
        } else {
            console.log('Robots Tag: Not Found');
        }

        if (canonicalMatch) {
            console.log(`Canonical URL: ${canonicalMatch[1]}`);
        } else {
            console.log('Canonical Tag: Not Found');
        }

        console.log(`Contains BlogPosting Schema: ${!!schemaMatch}`);
        console.log('-------------------------------');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
