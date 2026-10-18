import fs from 'fs';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';
const SLUG = 'Topicwise-pyqs-e-booklet-code-398-2026';
const OUTPUT_FILE = 'product_Topicwise-pyqs-e-booklet-code-398-2026.csv';

async function findCorrectSlug() {
    const listUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/products/`;
    console.log(`Fetching list from ${listUrl}...`);

    try {
        let currentUrl = listUrl;
        while (currentUrl) {
            const response = await fetch(currentUrl, {
                headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
            });
            const data = await response.json();

            // Search for 398 AND 2026
            const match = data.results.find(p => p.title.includes('398') && p.title.includes('2026'));

            if (match) {
                console.log('✅ Found match in list:');
                console.log(JSON.stringify(match, null, 2));

                // Save the list item as CSV immediately (better than nothing)
                saveToCSV(match);

                // Try Public API with ID
                const publicIdUrl = `${TESTPRESS_BASE_URL}api/v2.5/products/${match.id}/`;
                console.log(`\nTesting Public ID URL: ${publicIdUrl}`);
                const resPublic = await fetch(publicIdUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
                console.log(`Status: ${resPublic.status}`);

                if (resPublic.ok) {
                    const publicData = await resPublic.json();
                    console.log('✅ Fetched from Public API');
                    saveToCSV(publicData);
                }

                // Try Public API with User Slug
                const userSlug = 'Topicwise-pyqs-e-booklet-code-398-2026';
                const publicSlugUrl = `${TESTPRESS_BASE_URL}api/v2.5/products/${userSlug}/`;
                console.log(`\nTesting Public Slug URL: ${publicSlugUrl}`);
                const resSlug = await fetch(publicSlugUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
                console.log(`Status: ${resSlug.status}`);

                if (resSlug.ok) {
                    const slugData = await resSlug.json();
                    console.log('✅ Fetched from Public API via Slug');
                    saveToCSV(slugData);
                }

                return;
            }

            currentUrl = data.next;
        }
        console.log('❌ No product found matching "398" and "2026"');

    } catch (error) {
        console.error('Error:', error);
    }
}

function saveToCSV(data) {
    const headers = Object.keys(data);
    const csvRows = [headers.join(',')];
    const values = headers.map(header => {
        const val = data[header];
        if (val === null || val === undefined) return '';
        const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${stringVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

findCorrectSlug();
