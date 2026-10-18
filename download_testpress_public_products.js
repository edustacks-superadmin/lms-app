import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';
const OUTPUT_FILE = 'testpress_public_product_details.csv';

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromTestpress(url, token) {
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${token}` }
        });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return null;
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    // Get all unique keys from all objects to ensure we have headers for everything
    const headers = Array.from(new Set(data.flatMap(Object.keys)));

    // Create CSV header row
    const csvRows = [headers.join(',')];

    // Create CSV data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            // Handle different data types
            if (val === null || val === undefined) return '';

            // Escape quotes and wrap in quotes if string contains comma or newline
            const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            const escaped = stringVal.replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

async function downloadProductDetails() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   DOWNLOADING PUBLIC PRODUCT DETAILS       ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // 1. Fetch all products (summary list) using the ADMIN endpoint to get slugs
    let allProductsSummary = [];
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/products/`;
    let pageNum = 1;

    console.log('📚 Step 1: Fetching product list from /api/v2.5/admin/products/...\n');

    while (currentUrl) {
        console.log(`   📄 Fetching list page ${pageNum}...`);
        const data = await fetchFromTestpress(currentUrl, TESTPRESS_TOKEN);

        if (!data || !data.results) break;

        allProductsSummary = allProductsSummary.concat(data.results);
        currentUrl = data.next;
        pageNum++;

        if (currentUrl) await delay(200);
    }

    console.log(`\n   ✅ Found ${allProductsSummary.length} products in total.`);

    if (allProductsSummary.length === 0) {
        console.log('\n⚠️ No products found. Exiting.');
        return;
    }

    // 2. Fetch details for each product
    console.log('\n📚 Step 2: Fetching details for each product...\n');

    const detailedProducts = [];
    let processedCount = 0;

    for (const product of allProductsSummary) {
        const identifier = product.slug || product.id;
        if (!identifier) {
            console.warn(`   ⚠️ Skipping product with no slug/id: ${product.title}`);
            continue;
        }

        const detailUrl = `${TESTPRESS_BASE_URL}api/v2.5/products/${identifier}/`;

        const detailData = await fetchFromTestpress(detailUrl, TESTPRESS_TOKEN);

        if (detailData) {
            detailedProducts.push(detailData);
        }

        processedCount++;
        if (processedCount % 10 === 0) {
            console.log(`   ...processed ${processedCount}/${allProductsSummary.length} products`);
        }

        // Delay to be nice to the API
        await delay(300);
    }

    console.log(`\n✅ Successfully fetched details for ${detailedProducts.length} products.`);

    // 3. Save to CSV
    if (detailedProducts.length > 0) {
        console.log('\n📝 Converting to CSV...');
        const csvContent = convertToCSV(detailedProducts);

        console.log(`💾 Saving to ${OUTPUT_FILE}...`);
        fs.writeFileSync(OUTPUT_FILE, csvContent);

        console.log('\n✨ Done! Detailed product file saved successfully.');
    } else {
        console.log('\n⚠️ No detailed data collected.');
    }
}

downloadProductDetails();
