const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

// Load envs manually
const dotenv = require('dotenv');
const envFiles = ['.env', '.env.local'];
envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file });
    }
});

const fetch = global.fetch || require('node-fetch');

async function getTestpressToken() {
    const startUrl = process.env.TESTPRESS_BASE_URL;
    if (!startUrl) throw new Error("TESTPRESS_BASE_URL missing");

    const response = await fetch(`${startUrl}/api/v2.5/auth-token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: process.env.TESTPRESS_USERNAME,
            password: process.env.TESTPRESS_PASSWORD
        })
    });
    if (!response.ok) throw new Error("Failed to get Testpress token: " + response.statusText);
    const data = await response.json();
    return data.token;
}

async function main() {
    try {
        console.log('Starting probe 3...');
        const token = await getTestpressToken();
        const baseUrl = process.env.TESTPRESS_BASE_URL;

        const batches = await prisma.batches.findMany({
            where: { testpress_id: { not: null } },
            select: { id: true, name: true, testpress_id: true }
        });

        console.log(`Found ${batches.length} batches`);
        const batch = batches[0];

        if (batch) {
            console.log(`Inspecting batch: ${batch.name} (${batch.testpress_id})`);

            const detailUrl = `${baseUrl}/api/v2.5/admin/batches/${batch.testpress_id}/`;
            const res = await fetch(detailUrl, { headers: { 'Authorization': `JWT ${token}` } });

            if (res.ok) {
                const data = await res.json();
                console.log('Batch URL field:', data.url);

                // Try appending students to the returned URL
                if (data.url) {
                    const derived = data.url.endsWith('/') ? `${data.url}students/` : `${data.url}/students/`;
                    console.log('Checking derived URL:', derived);
                    const res2 = await fetch(derived, { headers: { 'Authorization': `JWT ${token}` } });
                    console.log(`  -> Status ${res2.status}`);
                }
            } else {
                console.log(`Failed to fetch batch details: ${res.status}`);
            }

            const testUrls = [
                `${baseUrl}/api/v2.5/admin/users/?batches__id=${batch.testpress_id}`,
                `${baseUrl}/api/v2.5/admin/users/?batch__id=${batch.testpress_id}`,
                `${baseUrl}/api/v2.5/admin/institute/batches/${batch.testpress_id}/students/`
            ];

            for (const url of testUrls) {
                console.log(`Testing URL: ${url}`);
                const res = await fetch(url, { headers: { 'Authorization': `JWT ${token}` } });
                if (res.ok) {
                    const d = await res.json();
                    const count = d.count !== undefined ? d.count : (d.results ? d.results.length : '?');
                    console.log(`  -> Status 200, Count: ${count}`);
                } else {
                    console.log(`  -> Status ${res.status}`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
