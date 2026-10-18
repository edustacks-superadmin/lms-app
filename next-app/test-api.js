// Using native fetch

async function testCron() {
    const url = 'http://localhost:3000/api/cron/post-notifications';

    console.log(`Testing Cron Trigger to ${url}...`);

    try {
        const start = Date.now();
        // Add a secret if needed, but the code showed it's optional for now or checks env
        // Code: const expectedSecret = process.env.CRON_SECRET; 
        // If it returns 401, we know we need it. 

        const response = await fetch(url);
        const duration = Date.now() - start;

        console.log(`Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('Response Body:', text);

    } catch (error) {
        console.error('Request failed:', error.message);
    }
}

testCron();
