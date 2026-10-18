// Check actual total count from Testpress v2.5 API
require('dotenv').config({ path: '.env.local' });

async function investigateExamCount() {
    try {
        // Get auth token
        const authResponse = await fetch(`${process.env.TESTPRESS_BASE_URL}/api/v2.5/auth-token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: process.env.TESTPRESS_USERNAME,
                password: process.env.TESTPRESS_PASSWORD
            })
        });

        const { token } = await authResponse.json();

        // Fetch first page to get count
        const response = await fetch(`${process.env.TESTPRESS_BASE_URL}/api/v2.5/admin/exams/?page=1`, {
            headers: {
                'Authorization': `JWT ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log('\n=== TESTPRESS EXAM INVESTIGATION ===\n');
        console.log(`Total exams in Testpress: ${data.count}`);
        console.log(`Results per page: ${data.results.length}`);
        console.log(`Next page exists: ${!!data.next}`);
        console.log(`Total pages (estimated): ${Math.ceil(data.count / data.results.length)}`);

        console.log('\n=== FIRST EXAM SAMPLE ===');
        if (data.results && data.results.length > 0) {
            const firstExam = data.results[0];
            console.log(`ID: ${firstExam.id}`);
            console.log(`Title: ${firstExam.title}`);
            console.log(`Slug: ${firstExam.slug}`);
        }

        console.log('\n=== RECOMMENDATION ===');
        const totalPages = Math.ceil(data.count / data.results.length);
        console.log(`You need to sync ${totalPages} pages to get all ${data.count} exams`);
        console.log(`Currently synced: 3510 exams`);
        console.log(`Missing: ${data.count - 3510} exams`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

investigateExamCount();
