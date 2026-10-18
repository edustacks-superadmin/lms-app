// Native fetch in Node 18+

async function testApi() {
    console.log('Testing /api/questions...');
    try {
        const response = await fetch('http://localhost:3000/api/questions?page=1&perPage=5');
        const data = await response.json();

        if (data.success) {
            console.log('Success!');
            console.log(`Count: ${data.count}`);
            console.log(`Returned: ${data.data.length}`);
            if (data.data.length > 0) {
                console.log('Sample Question:', data.data[0].question_text);
                console.log('Options count:', data.data[0].options ? data.data[0].options.length : 'MISSING');
            }
        } else {
            console.error('API Error:', data.error);
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
        console.log('Ensure the Next.js server is running on port 3000.');
    }
}

testApi();
