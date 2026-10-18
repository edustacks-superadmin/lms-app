const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function check(version) {
    const url = `${TESTPRESS_BASE_URL}api/${version}/courses/`;
    console.log(`Checking ${url}...`);
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        console.log(`${version}: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`   Found ${data.count || data.results?.length || 0} items.`);
            if (data.results && data.results.length > 0) {
                console.log('Sample Keys:', Object.keys(data.results[0]));
            }
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    await check('v2.3');
    await check('v2.4');
}

run();
