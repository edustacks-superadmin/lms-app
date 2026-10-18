const fs = require('fs');
const path = require('path');
const https = require('https');
const urlModule = require('url');

// ---------------- CONFIGURATION ----------------
const RANGES = [
    { start: 501, end: 505 },
    { start: 531, end: 535 },
    { start: 536, end: 540 }
];
const BASE_URL = 'https://thapovaninstitute.testpress.in/admin/questions/';

// COOKIE from user 
const COOKIE = '_ga_1ERRBP4E25=GS2.1.s1750743492$o4$g0$t1750743492$j60$l0$h0; __stripe_mid=c4bf2131-eacd-4d3f-babd-fa8f026c0edb92609d; _ga=GA1.2.1216943176.1748750057; _ga_1LD8TTMWSX=GS2.1.s1760006837$o10$g1$t1760006939$j60$l0$h0; csrftoken=50KJ9x591Vn4j2W3CMJUUR6usr4t5R66; sessionid=6mvbtpp3f51flnxh9y63addkg9fkrd9r; _gid=GA1.2.1153095723.1765737494; _gat=1; _ga_RRJNNW0R6Y=GS2.2.s1766079483$o286$g1$t1766083563$j60$l0$h0';
// -----------------------------------------------

if (!COOKIE) {
    console.error('ERROR: You must paste your Cookie string in the script first!');
    process.exit(1);
}

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
            timeout: 30000 // 30 second timeout
        };

        const req = https.request(options, (res) => {
            // Handle redirects
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
            reject(new Error('Request timed out after 30 seconds'));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log(`Starting restricted scrape for specific ranges...`);

    const outputDir = path.join(__dirname, 'scraped_html');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (const range of RANGES) {
        const start = range.start;
        const end = range.end;
        const fileName = `testpress_pages_${start}_to_${end}.html`;
        const outFile = path.join(outputDir, fileName);

        console.log(`--- Generating ${fileName} (Pages ${start} to ${end}) ---`);
        const stream = fs.createWriteStream(outFile, { encoding: 'utf8' });

        for (let page = start; page <= end; page++) {
            const url = `${BASE_URL}?page=${page}`;
            console.log(`Fetching page ${page}: ${url}`);

            try {
                const response = await fetchPageRequest(url, COOKIE);

                if (!response.ok) {
                    console.error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
                    if (response.status === 403 || response.status === 401) {
                        console.error('Authentication invalid. Check your cookie.');
                        stream.end();
                        return;
                    }
                    continue;
                }

                const html = await response.text();

                if (html.includes('Login') && !html.includes('Logout')) {
                    console.error('Session expired or invalid cookie (redirected to login).');
                    stream.end();
                    return;
                }

                // Write raw HTML with separator
                stream.write(`\n<!-- ========================= PAGE ${page} START (${url}) ========================= -->\n`);
                stream.write(html);
                stream.write(`\n<!-- ========================= PAGE ${page} END ========================= -->\n`);

            } catch (err) {
                console.error(`Error processing page ${page}:`, err.message);
            }

            // Small delay to avoid rate limiting
            await delay(500);
        }

        stream.end();
        console.log(`Finished ${fileName}`);
    }

    console.log(`Restricted processing completed! Files are in: ${outputDir}`);
}

main();

