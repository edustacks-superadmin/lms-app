const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const INPUT_DIR = path.join(__dirname, 'scraped_html');
const OUTPUT_FILE = path.join(INPUT_DIR, 'consolidated_batch_report_v2.csv');

function parseBatchHtml(html) {
    const $ = cheerio.load(html);
    const members = [];

    $('tr[id^="user_row_"]').each((i, el) => {
        const idStr = $(el).attr('id').replace('user_row_', '');
        const memberId = parseInt(idStr);
        const tds = $(el).find('td');
        // Email is usually in the 4th column (index 3)
        // Check if there are enough columns
        let email = '';
        if (tds.length >= 4) {
            email = $(tds[3]).text().trim();
        }

        if (!isNaN(memberId)) {
            members.push({ id: memberId, email });
        }
    });

    return members;
}

function writeCsv(batchesData) {
    const header = 'Batch ID,Batch Name,Members ID (Numeric),Emails,Source File\n';
    let content = header;

    for (const batch of batchesData) {
        const batchId = batch.id;
        const batchName = batch.name.replace(/"/g, '""'); // Escape quotes
        const memberIds = batch.members.map(m => m.id).join(',');
        const emails = batch.members.map(m => m.email).join(',');
        const sourceFile = batch.sourceFile;

        // Quote fields that might contain commas
        content += `${batchId},"${batchName}","${memberIds}","${emails}",${sourceFile}\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
    console.log(`CSV Report saved to ${OUTPUT_FILE}`);
}

async function main() {
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.html'));

    const allBatches = [];

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(INPUT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Split by Batch Start markers
        // Marker format: <!-- ========================= BATCH {id} START ({name}) ========================= -->
        // We can split by "<!-- ========================= BATCH "
        // But simpler to regex find structure

        // Regex to find start positions
        const batchRegex = /<!-- ========================= BATCH (\d+) (?:PAGE \d+ )?START \((.*?)\) ========================= -->/g;

        let match;
        // logic: identifying chunks of content belonging to a batch
        // Since pages for the same batch might be split or adjacent, we need to handle "PAGE X" marker.
        // My scraper appends: 
        // <!-- BATCH {id} PAGE {num} START ({name}) -->
        // ... html ...
        // <!-- BATCH {id} PAGE {num} END -->

        // Or for single page:
        // <!-- BATCH {id} START ({name}) -->
        // ... html ...
        // <!-- BATCH {id} END -->

        // I can just loop through all batches found in the file.
        // I need to aggregate by Batch ID because multiple pages mean multiple chunks for the same batch.

        const chunks = [];
        let lastIndex = 0;

        // Reset regex
        batchRegex.lastIndex = 0;

        while ((match = batchRegex.exec(content)) !== null) {
            const batchId = parseInt(match[1]);
            const batchName = match[2];
            const startIndex = match.index;

            // Find the END tag for this block
            // Could be "PAGE {num} END" or just "END"
            // <!-- ========================= BATCH {id} (PAGE {num} )?END ========================= -->
            const endRegex = new RegExp(`<!-- ========================= BATCH ${batchId} (?:PAGE \\d+ )?END ========================= -->`, 'g');
            endRegex.lastIndex = startIndex;
            const endMatch = endRegex.exec(content);

            if (endMatch) {
                const endIndex = endMatch.index + endMatch[0].length;
                const htmlChunk = content.substring(startIndex, endIndex);

                // Check if we already have this batch in current file processing or globally
                let batchEntry = allBatches.find(b => b.id === batchId);
                if (!batchEntry) {
                    batchEntry = {
                        id: batchId,
                        name: batchName,
                        members: [],
                        sourceFile: file
                    };
                    allBatches.push(batchEntry);
                }

                // Parse members from this chunk
                const members = parseBatchHtml(htmlChunk);

                // Add unique members
                for (const m of members) {
                    if (!batchEntry.members.find(em => em.id === m.id)) {
                        batchEntry.members.push(m);
                    }
                }
            }
        }
    }

    // Sort batches by ID (desc)
    allBatches.sort((a, b) => b.id - a.id);

    console.log(`Found ${allBatches.length} batches total.`);
    writeCsv(allBatches);
}

main();
