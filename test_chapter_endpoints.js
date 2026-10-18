const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function check(endpoint) {
    const url = `${TESTPRESS_BASE_URL}api/${endpoint}`;
    console.log(`Checking ${url}...`);
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        console.log(`${endpoint}: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`   Found ${data.count || data.results?.length || 0} items.`);
            if (data.results && data.results.length > 0) {
                console.log('Sample:', JSON.stringify(data.results[0], null, 2));
            }
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    // Get a course ID first
    const cRes = await fetch(`${TESTPRESS_BASE_URL}api/v2.4/courses/`, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
    const cData = await cRes.json();
    const courseId = cData.results[0].id;
    console.log(`Using Course ID: ${courseId}`);

    await check(`v2.5/admin/courses/${courseId}/chapters/`);
    await check(`v2.4/courses/${courseId}/chapters/`); // Retrying just in case
    await check(`v2.2/courses/${courseId}/chapters/`);
    await check(`v2.3/courses/${courseId}/chapters/`);
}

run();
