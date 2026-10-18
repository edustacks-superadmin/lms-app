import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

// Output Files
const USERS_CSV = 'testpress_users.csv';
const BATCHES_CSV = 'testpress_user_batches.csv';
const SUBSCRIPTIONS_CSV = 'testpress_user_subscriptions.csv';

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromTestpress(url) {
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        if (!response.ok) {
            console.error(`   ❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`   ❌ Error fetching ${url}:`, error.message);
        return null;
    }
}

function saveToCSV(filename, data) {
    if (!data || data.length === 0) return;

    // Get all unique keys
    const headers = Array.from(new Set(data.flatMap(Object.keys)));
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '';
            const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    fs.writeFileSync(filename, csvRows.join('\n'));
    console.log(`💾 Saved ${data.length} records to ${filename}`);
}

async function exportUserData() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   EXPORTING TESTPRESS USER DATA            ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // 1. Fetch All Users
    console.log('📚 Step 1: Fetching all users...');
    let allUsers = [];
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/users/`;
    let pageNum = 1;

    while (currentUrl) {
        console.log(`   📄 Fetching users page ${pageNum}...`);
        const data = await fetchFromTestpress(currentUrl);

        if (!data || !data.results) break;

        allUsers = allUsers.concat(data.results);
        currentUrl = data.next;
        pageNum++;

        // Limit for testing/demo purposes
        if (allUsers.length >= 50) {
            console.log('   ⚠️ Limit reached (50 users). Stopping fetch.');
            break;
        }

        if (currentUrl) await delay(200);
    }

    console.log(`\n   ✅ Found ${allUsers.length} users.`);

    // 2. Fetch Details, Batches, and Subscriptions for each user
    console.log('\n📚 Step 2: Fetching details, batches, and subscriptions...');

    const userDetailsList = [];
    const allBatches = [];
    const allSubscriptions = [];

    let processedCount = 0;

    for (const userSummary of allUsers) {
        const userId = userSummary.id;

        // A. Fetch User Details
        const detailUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/users/${userId}/`;
        const userDetail = await fetchFromTestpress(detailUrl);

        if (userDetail) {
            userDetailsList.push(userDetail);
        } else {
            // Fallback to summary if detail fails
            userDetailsList.push(userSummary);
        }

        // B. Fetch Batches
        const batchesUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/users/${userId}/batches/`;
        const batchesData = await fetchFromTestpress(batchesUrl);
        if (batchesData && batchesData.results) {
            batchesData.results.forEach(batch => {
                allBatches.push({
                    user_id: userId,
                    user_username: userSummary.username,
                    ...batch
                });
            });
        }

        // C. Fetch Subscriptions
        const subsUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/users/${userId}/subscriptions/`;
        const subsData = await fetchFromTestpress(subsUrl);
        if (subsData && subsData.results) {
            subsData.results.forEach(sub => {
                allSubscriptions.push({
                    user_id: userId,
                    user_username: userSummary.username,
                    ...sub
                });
            });
        }

        processedCount++;
        if (processedCount % 10 === 0) {
            console.log(`   ...processed ${processedCount}/${allUsers.length} users`);
        }

        // Delay to be nice
        await delay(200);
    }

    console.log('\n✅ Data collection complete.');

    // 3. Save to CSVs
    console.log('\n📝 Saving to CSV files...');
    saveToCSV(USERS_CSV, userDetailsList);
    saveToCSV(BATCHES_CSV, allBatches);
    saveToCSV(SUBSCRIPTIONS_CSV, allSubscriptions);

    console.log('\n✨ Export finished successfully!');
}

exportUserData();
