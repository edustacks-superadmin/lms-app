
const { PrismaClient } = require('@prisma/client');

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const DELAY_MS = 2000; // 2 seconds delay between requests to be safe

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    if (!N8N_WEBHOOK_URL) {
        console.error('❌ Error: N8N_WEBHOOK_URL is missing in .env.local');
        return;
    }

    const targetRegNo = process.argv[2];
    if (targetRegNo) {
        console.log(`🎯 Test Mode: Targeting specific Reg No: ${targetRegNo}`);
    } else {
        console.log('🔍 Finding records with missing Special Category...');
    }

    // Build Where Clause
    const whereClause = targetRegNo
        ? { registration_number: targetRegNo } // Target specific user
        : {
            OR: [
                { special_category: null },
                { special_category_rank: null }
            ],
            is_active: true
        };

    const records = await prisma.external_exam_results.findMany({
        where: whereClause,
        select: {
            id: true,
            registration_number: true,
            dob: true,
            full_name: true
        }
    });

    console.log(`📋 Found ${records.length} records to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const [index, record] of records.entries()) {
        const { id, registration_number, dob, full_name } = record;

        // Format DOB to DD/MM/YYYY for N8N
        const d = new Date(dob);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = d.getFullYear();
        const formattedDob = `${day}/${month}/${year}`;

        console.log(`[${index + 1}/${records.length}] Processing ${full_name} (${registration_number})...`);

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: {
                        registration_number,
                        dob: formattedDob
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`N8N Error: ${response.status} ${response.statusText}`);
            }

            const n8nData = await response.json();

            // Handle different N8N response structures (single object or array)
            const resultData = Array.isArray(n8nData) ? n8nData[0] : n8nData;

            // Extract the data object
            let candidateData = null;
            if (resultData.data && resultData.data.rows) {
                candidateData = resultData.data;
            } else if (resultData.rows) {
                candidateData = resultData;
            } else if (resultData.success && resultData.data) {
                candidateData = resultData.data;
            }

            if (!candidateData) {
                console.warn(`⚠️  No data found for ${registration_number}`);
                failCount++;
                continue;
            }

            // Prepare update payload
            // Note: N8N script returns special_category string at top level, but rank is in rows
            const special_category = candidateData.special_category || null;

            let special_category_rank = null;
            if (candidateData.rows && candidateData.rows.length > 0) {
                const row = candidateData.rows[0];
                if (row.special_category_rank && row.special_category_rank !== '-') {
                    special_category_rank = String(row.special_category_rank);
                }
            }

            // Update in DB
            await prisma.external_exam_results.update({
                where: { id },
                data: {
                    special_category: special_category,
                    special_category_rank: special_category_rank
                }
            });

            console.log(`✅ Updated: Special: ${special_category || '--'}, Rank: ${special_category_rank || '--'}`);
            successCount++;

        } catch (error) {
            console.error(`❌ Failed for ${registration_number}:`, error.message);
            failCount++;
        }

        // Wait before next request
        if (index < records.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Total Processed: ${records.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
