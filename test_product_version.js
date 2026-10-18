const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function check(version) {
    const url = `${TESTPRESS_BASE_URL}api/${version}/products/`;
    console.log(`Checking ${url}...`);
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        console.log(`Version ${version}: ${response.status} ${response.statusText}`);
    } catch (e) {
        console.log(`Version ${version} Error: ${e.message}`);
    }
}

async function run() {
    await check('v2.2');
    await check('v2.3');
    await check('v2.4');
    await check('v2.5');
}

run();
