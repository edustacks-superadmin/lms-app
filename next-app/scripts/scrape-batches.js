const fs = require('fs');
const path = require('path');
const https = require('https');
const urlModule = require('url');
const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

// ---------------- CONFIGURATION ----------------
const BASE_URL = 'https://thapovaninstitute.testpress.in/members/batches/';
const COOKIE = '_ga_1ERRBP4E25=GS2.1.s1750743492$o4$g0$t1750743492$j60$l0$h0; __stripe_mid=c4bf2131-eacd-4d3f-babd-fa8f026c0edb92609d; _ga=GA1.2.1216943176.1748750057; _ga_1LD8TTMWSX=GS2.1.s1760006837$o10$g1$t1760006939$j60$l0$h0; csrftoken=50KJ9x591Vn4j2W3CMJUUR6usr4t5R66; sessionid=6mvbtpp3f51flnxh9y63addkg9fkrd9r; _gid=GA1.2.1153095723.1765737494; _gat=1; _ga_RRJNNW0R6Y=GS2.2.s1766208479$o301$g1$t1766210129$j56$l0$h0';
const OUTPUT_DIR = path.join(__dirname, 'scraped_html');
// -----------------------------------------------

const prisma = new PrismaClient();

// Helper: Fetch with HTTPS
function fetchPageRequest(pageUrl, cookie) {
    return new Promise((resolve, reject) => {
        const parseUrl = urlModule.parse(pageUrl);
        const options = {
            hostname: parseUrl.hostname,
            path: parseUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookie
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let newLocation = res.headers.location;
                if (newLocation.startsWith('/')) {
                    newLocation = `https://${parseUrl.hostname}${newLocation}`;
                }
                console.log(`Redirecting to ${newLocation}`);
                fetchPageRequest(newLocation, cookie).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ ok: true, status: res.statusCode, text: () => Promise.resolve(data) });
                } else {
                    resolve({ ok: false, status: res.statusCode, statusText: res.statusMessage, text: () => Promise.resolve(data) });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    if (COOKIE === 'PASTE_YOUR_COOKIE_HERE') {
        console.error('ERROR: You must paste your Cookie string in the script first!');
        process.exit(1);
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('Fetching ALL batches from database...');
    const batches = await prisma.batches.findMany({
        where: {
            testpress_id: { not: null }
        },
        orderBy: { testpress_id: 'desc' }, // Optional: predictable order
        select: { testpress_id: true, name: true }
    });

    console.log(`Found ${batches.length} batches to scrape.`);

    let index = 0;
    for (const batch of batches) {
        index++;
        // Sanitize name for filename: keep only safe chars
        const safeName = batch.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        // Filename format: batch_{id}_{safeName}.html
        const fileName = `batch_${batch.testpress_id}_${safeName}.html`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        console.log(`\n--- Processing [${index}/${batches.length}] Batch: ${batch.name} (ID: ${batch.testpress_id}) -> ${fileName} ---`);

        // Initialize/Overwrite file for this batch
        fs.writeFileSync(filePath, '', 'utf8');

        const baseUrl = `${BASE_URL}${batch.testpress_id}/`;
        let currentUrl = baseUrl;
        let pageNum = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            try {
                console.log(`    > Fetching Page ${pageNum}...`);
                const response = await fetchPageRequest(currentUrl, COOKIE);

                if (!response.ok) {
                    console.error(`  > Failed to fetch page ${pageNum}: ${response.status} ${response.statusText}`);
                    hasNextPage = false;
                    continue;
                }

                const html = await response.text();

                if (html.includes('Login') && !html.includes('Logout')) {
                    console.error('  > Session expired or invalid cookie (redirected to login). Stopping.');
                    process.exit(1);
                }

                fs.appendFileSync(filePath, `\n<!-- ========================= BATCH ${batch.testpress_id} PAGE ${pageNum} START (${batch.name}) ========================= -->\n`);
                fs.appendFileSync(filePath, html);
                fs.appendFileSync(filePath, `\n<!-- ========================= BATCH ${batch.testpress_id} PAGE ${pageNum} END ========================= -->\n`);

                console.log(`    > Saved Page ${pageNum}.`);

                const $ = cheerio.load(html);
                const nextBtn = $('a, button').filter((i, el) => $(el).text().trim() === 'Next');
                const nextUrlSuffix = nextBtn.attr('hx-get');

                if (nextBtn.length > 0 && nextUrlSuffix) {
                    currentUrl = `${baseUrl}${nextUrlSuffix}`;
                    pageNum++;
                    await delay(1000);
                } else {
                    hasNextPage = false;
                }

            } catch (e) {
                console.error(`  > Error scraping ${currentUrl}:`, e.message);
                hasNextPage = false;
            }
        }

        console.log(`Saved batch to ${filePath}`);
        await delay(1000);
    }

    console.log(`\nAll Done! Files are in ${OUTPUT_DIR}`);
    await prisma.$disconnect();
}

main();
