import fs from 'fs';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';
const PRODUCT_ID = 363;
const SEARCH_TITLE = 'Topicwise';

async function investigate() {
    // 1. Try public product by ID
    const publicIdUrl = `${TESTPRESS_BASE_URL}api/v2.5/products/${PRODUCT_ID}/`;
    console.log(`Trying public product ID: ${publicIdUrl}`);
    try {
        const res = await fetch(publicIdUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        if (res.ok) {
            console.log('✅ Found public product by ID!');
            const data = await res.json();
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ Public product ID failed: ${res.status}`);
        }
    } catch (e) { console.error(e); }

    // 2. Search courses
    console.log('\nSearching courses...');
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/`;

    while (currentUrl) {
        const res = await fetch(currentUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        const data = await res.json();

        const match = data.results.find(c => c.title.toLowerCase().includes(SEARCH_TITLE.toLowerCase()));
        if (match) {
            console.log(`✅ Found matching COURSE: ID=${match.id}, Title="${match.title}"`);
            console.log(JSON.stringify(match, null, 2));
            return;
        }
        currentUrl = data.next;
    }
    console.log('❌ No matching course found.');
}

investigate();
