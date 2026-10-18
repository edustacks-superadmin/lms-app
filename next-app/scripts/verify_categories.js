const http = require('http');

const options = {
    hostname: '127.0.0.1', // Accessing via subdomain to trigger institute resolution
    port: 3001,
    path: '/posts',
    method: 'GET',
    headers: {
        'Host': 'maheshiesacademy.localhost:3001'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('--- Category Verification ---');
        // Check if category pills are rendered
        // looking for something like href="/posts?category="

        // In the code: <Link href={`/posts?category=${cat.id}`}
        const categoryLinks = (data.match(/href="\/posts\?category=/g) || []).length;
        console.log(`Category Filter Links Found: ${categoryLinks}`);

        // Check for specific category names if any (not sure of exact DB content, so just checking existence of structure)
        // The snippet: <span className="...">{cat.count}</span>
        // Just looking for the pattern of category cloud

        if (data.includes('All Posts') && categoryLinks > 0) {
            console.log('Category Cloud Structure: Present');
        } else {
            console.log('Category Cloud Structure: MISSING or No Categories');
        }

        // Check for dropwdown
        const hasSelect = data.includes('<select');
        const optionCount = (data.match(/<option/g) || []).length;

        console.log(`Dropdown Found: ${hasSelect}`);
        console.log(`Dropdown Options: ${optionCount}`);

        if (hasSelect && optionCount > 1) {
            console.log('Category Dropdown Structure: Present');
        } else {
            console.log('Category Dropdown Structure: MISSING or Failed');
        }

        // Check for new filters
        const hasPopular = data.includes('filter=popular');
        const hasFeatured = data.includes('filter=featured');
        console.log(`Popular Filter Present: ${hasPopular}`);
        console.log(`Featured Filter Present: ${hasFeatured}`);

        // Log a small snippet
        const cloudStart = data.indexOf('All Posts');
        if (cloudStart !== -1) {
            console.log('Snippet:', data.substring(cloudStart, cloudStart + 300).replace(/\s+/g, ' '));
        }

        console.log('---------------------------');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
