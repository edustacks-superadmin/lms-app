const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;
    console.log('🔐 Authenticating...');

    return new Promise((resolve, reject) => {
        const req = https.request(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const data = JSON.parse(body);
                    resolve(data.token);
                } else {
                    reject(new Error(`Auth Failed: ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify({ username: TESTPRESS_USERNAME, password: TESTPRESS_PASSWORD }));
        req.end();
    });
}

async function fetchSubjectsPage(token, page = 1) {
    const url = new URL(`${TESTPRESS_BASE_URL}/admin/subjects/`);
    url.searchParams.append('page', page);

    console.log(`📥 Scraping subjects from page ${page}...`);

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: {
                'Authorization': `JWT ${token}`,
                'Cookie': `token=${token}`
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(body);
                } else {
                    console.error(`HTTP ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function parseSubjects(html) {
    const $ = cheerio.load(html);
    const subjects = [];

    // Find all subject rows in the table
    $('table tbody tr').each((i, row) => {
        const $row = $(row);

        // Get subject name from the first column link
        const nameLink = $row.find('td:first-child a').first();
        const subjectName = nameLink.text().trim();

        // Get subject ID from the questions filter link
        const questionsLink = $row.find('td a[href*="/admin/questions/?subject="]').attr('href');

        if (subjectName && questionsLink) {
            const match = questionsLink.match(/subject=(\d+)/);
            if (match) {
                const subjectId = parseInt(match[1]);
                subjects.push({
                    testpress_id: subjectId,
                    name: subjectName
                });
            }
        }
    });

    // Check if there's a next page
    const hasNext = $('.pagination a:contains("Next")').length > 0;

    return { subjects, hasNext };
}

async function importSubjects(subjects) {
    console.log(`\n📊 Processing ${subjects.length} subjects...\n`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const subject of subjects) {
        try {
            // Check if subject exists
            const existing = await prisma.$queryRaw`
                SELECT id FROM subjects WHERE testpress_id = ${subject.testpress_id} LIMIT 1
            `;

            if (existing && existing.length > 0) {
                // Update existing
                await prisma.$executeRaw`
                    UPDATE subjects 
                    SET name = ${subject.name},
                        updated_at = NOW()
                    WHERE testpress_id = ${subject.testpress_id}
                `;
                console.log(`  ♻️  Updated: ${subject.name} (ID: ${subject.testpress_id})`);
                updated++;
            } else {
                // Create new subject
                await prisma.$executeRaw`
                    INSERT INTO subjects (name, testpress_id, institute_id, created_at)
                    VALUES (${subject.name}, ${subject.testpress_id}, 10, NOW())
                `;
                console.log(`  ✅ Created: ${subject.name} (ID: ${subject.testpress_id})`);
                imported++;
            }
        } catch (error) {
            if (error.message.includes('duplicate key')) {
                console.log(`  ⚠️  Skipped: ${subject.name} (duplicate by name)`);
                skipped++;
            } else {
                console.error(`  ❌ Failed: ${subject.name} - ${error.message}`);
                skipped++;
            }
        }
    }

    return { imported, updated, skipped };
}

async function runSubjectScrape() {
    try {
        console.log('🚀 Testpress Subject Scraper\n');
        console.log('⚠️  Using web scraping since API endpoint is not available\n');

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        let allSubjects = [];
        let page = 1;
        let hasMore = true;

        // Scrape all pages
        while (hasMore && page <= 20) { // Limit to 20 pages for safety
            const html = await fetchSubjectsPage(token, page);
            const { subjects, hasNext } = parseSubjects(html);

            allSubjects = allSubjects.concat(subjects);
            console.log(`   Found ${subjects.length} subjects on page ${page}`);

            hasMore = hasNext;
            page++;

            // Small delay to avoid overwhelming the server
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`\n✅ Total subjects scraped: ${allSubjects.length}\n`);

        if (allSubjects.length === 0) {
            console.log('⚠️  No subjects found.');
            return;
        }

        const { imported, updated, skipped } = await importSubjects(allSubjects);

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Created:  ${imported}`);
        console.log(`♻️  Updated:  ${updated}`);
        console.log(`⚠️  Skipped:  ${skipped}`);
        console.log(`📁 Total:    ${allSubjects.length}`);
        console.log('='.repeat(50));

        console.log('\n✅ Subject import complete!');
        console.log('   You can now link questions to subjects during import.');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runSubjectScrape();
