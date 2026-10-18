const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();
const CSV_FILE = path.join(__dirname, 'scraped_html', 'consolidated_batch_report_v2.csv');

async function main() {
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`CSV file not found: ${CSV_FILE}`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(CSV_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isHeader = true;
    let counts = {
        totalRows: 0,
        batchesFound: 0,
        batchesNotFound: 0,
        membersAdded: 0,
        membersNotFound: 0,
        errors: 0
    };

    console.log('Starting import using Testpress IDs...');

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }

        counts.totalRows++;

        // CSV Parsing Logic with Regex to handle quoted strings with commas
        const parts = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);

        if (parts.length < 3) { // Need at least Batch ID and Member IDs
            console.warn(`Skipping malformed line: ${line}`);
            continue;
        }

        const batchTestpressId = parseInt(parts[0].trim());
        // Column 2 (Index 2) is "Members ID (Numeric)"
        const rawMemberIds = parts[2].trim().replace(/^"|"$/g, '');

        if (!batchTestpressId) continue;

        // 1. Find Batch
        const batch = await prisma.batches.findFirst({
            where: { testpress_id: batchTestpressId }
        });

        if (!batch) {
            // console.warn(`Batch with Testpress ID ${batchTestpressId} not found in DB.`);
            counts.batchesNotFound++;
            continue;
        }
        counts.batchesFound++;

        if (!rawMemberIds) continue;

        const memberTestpressIds = rawMemberIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        for (const tpId of memberTestpressIds) {
            try {
                // 2. Find Member by testpress_id
                const member = await prisma.members.findUnique({
                    where: { testpress_id: tpId },
                    select: { id: true }
                });

                if (!member) {
                    // console.warn(`Member with Testpress ID ${tpId} not found.`);
                    counts.membersNotFound++;
                    continue;
                }

                // 3. Add to Batch (Upsert / Ignore duplicates)
                const existing = await prisma.batch_members.findUnique({
                    where: {
                        batch_id_member_id: {
                            batch_id: batch.id,
                            member_id: member.id
                        }
                    }
                });

                if (!existing) {
                    await prisma.batch_members.create({
                        data: {
                            batch_id: batch.id,
                            member_id: member.id,
                            institute_id: batch.institute_id
                        }
                    });
                    counts.membersAdded++;
                }
            } catch (e) {
                console.error(`Error processing member ${tpId} for batch ${batchTestpressId}:`, e.message);
                counts.errors++;
            }
        }
    }

    console.log('\nImport Summary:');
    console.log(JSON.stringify(counts, null, 2));
    await prisma.$disconnect();
}

main();
