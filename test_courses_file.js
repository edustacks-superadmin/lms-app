import fs from 'fs';
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function check(version) {
    const url = `${TESTPRESS_BASE_URL}api/${version}/courses/`;
    let log = `Checking ${url}...\n`;
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        log += `${version}: ${response.status} ${response.statusText}\n`;
        if (response.ok) {
            const data = await response.json();
            log += `   Found ${data.count || data.results?.length || 0} items.\n`;
            if (data.results && data.results.length > 0) {
                log += `   Sample Keys: ${Object.keys(data.results[0]).join(', ')}\n`;
            }
        }
    } catch (e) {
        log += `Error: ${e.message}\n`;
    }
    fs.appendFileSync('api_check.log', log);
}

async function run() {
    fs.writeFileSync('api_check.log', 'Starting Check...\n');
    await check('v2.2');
    await check('v2.3');
    await check('v2.4');
    await check('v2.5');
}

run();
