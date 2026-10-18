// Use native fetch (Node.js 18+)
require('dotenv').config({ path: '.env.local' });

async function getTestpressExams() {
    try {
        // Get auth token
        const authResponse = await fetch(`${process.env.TESTPRESS_BASE_URL}/api/v2.5/auth-token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: process.env.TESTPRESS_USERNAME,
                password: process.env.TESTPRESS_PASSWORD
            })
        });

        const { token } = await authResponse.json();

        // Fetch exams using v2.5
        const examsResponse = await fetch(`${process.env.TESTPRESS_BASE_URL}/api/v2.5/admin/exams/?limit=1`, {
            headers: {
                'Authorization': `JWT ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const examsData = await examsResponse.json();

        if (examsData.results && examsData.results.length > 0) {
            const sampleExam = examsData.results[0];
            console.log('\n=== TESTPRESS EXAM FIELDS ===\n');
            console.log(JSON.stringify(sampleExam, null, 2));
            console.log('\n=== AVAILABLE FIELDS ===\n');
            console.log(Object.keys(sampleExam).join('\n'));
        } else {
            console.log('No exams found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

getTestpressExams();
