import fs from 'fs';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';
const TARGET_SLUG = 'Topicwise-pyqs-e-booklet-code-398-2026';

async function findProduct() {
    // 1. Try public API with slug
    const publicUrl = `${TESTPRESS_BASE_URL}api/v2.5/products/${TARGET_SLUG}/`;
    console.log(`Trying public API: ${publicUrl}`);
    try {
        const res = await fetch(publicUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Found via public API!');
            fs.writeFileSync('found_product.json', JSON.stringify(data, null, 2));
            return;
        } else {
            console.log(`❌ Public API failed: ${res.status}`);
        }
    } catch (e) { console.error(e); }

    // 2. Fetch all admin products and search by title
    console.log('Fetching all admin products to search...');
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/products/`;
    let found = null;

    while (currentUrl) {
        const res = await fetch(currentUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        const data = await res.json();

        // Search in this page
        const match = data.results.find(p =>
            p.title.toLowerCase().includes('topicwise') &&
            p.title.toLowerCase().includes('398')
        );

        if (match) {
            found = match;
            break;
        }

        currentUrl = data.next;
    }

    if (found) {
        console.log(`✅ Found in list: ID=${found.id}, Title="${found.title}"`);

        // Try to fetch details with ID
        const adminDetailUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/products/${found.id}/`;
        console.log(`Trying admin detail API: ${adminDetailUrl}`);
        const res = await fetch(adminDetailUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });

        if (res.ok) {
            const data = await res.json();
            console.log('✅ Fetched admin details!');
            fs.writeFileSync('found_product.json', JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ Admin detail API failed: ${res.status}`);
        }
    } else {
        console.log('❌ Product not found in admin list.');
    }
}

findProduct();
