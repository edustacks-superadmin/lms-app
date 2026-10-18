const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');

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

async function fetchSubjects(token, page = 1, pageSize = 100) {
    const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/subjects/?page=${page}&page_size=${pageSize}`;
    console.log(`📥 Fetching subjects from page ${page}...`);

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const data = JSON.parse(body);
                    resolve(data);
                } else {
                    console.error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function importSubjects(subjects) {
    console.log(`\n📊 Processing ${subjects.length} subjects...\n`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const tpSubject of subjects) {
        try {
            // Map parent subject if exists
            let parentId = null;
            if (tpSubject.parent_id) {
                const parent = await prisma.subjects.findUnique({
                    where: { testpress_id: tpSubject.parent_id }
                });
                parentId = parent?.id;
            }

            const subjectData = {
                name: tpSubject.name,
                testpress_id: tpSubject.id,
                parent_id: parentId,
                institute_id: 10
            };

            // Check if subject exists
            const existing = await prisma.subjects.findUnique({
                where: { testpress_id: tpSubject.id }
            });

            if (existing) {
                await prisma.subjects.update({
                    where: { id: existing.id },
                    data: subjectData
                });
                console.log(`  ♻️  Updated subject: ${tpSubject.name} (ID: ${existing.id})`);
                updated++;
            } else {
                const subject = await prisma.subjects.create({
                    data: subjectData
                });
                console.log(`  ✅ Created subject: ${tpSubject.name} (ID: ${subject.id})`);
                imported++;
            }

        } catch (error) {
            console.error(`  ❌ Failed to import ${tpSubject.name}: ${error.message}`);
            skipped++;
        }
    }

    return { imported, updated, skipped };
}

async function runSubjectImport() {
    try {
        console.log('🚀 Testpress Subject Import\n');

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        let allSubjects = [];
        let page = 1;
        let hasMore = true;

        // Fetch all subjects with pagination
        while (hasMore) {
            const data = await fetchSubjects(token, page);
            const subjects = data.results || [];
            allSubjects = allSubjects.concat(subjects);

            console.log(`   Found ${subjects.length} subjects on page ${page}`);

            if (data.next) {
                page++;
            } else {
                hasMore = false;
            }
        }

        console.log(`\n✅ Total subjects fetched: ${allSubjects.length}\n`);

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

        console.log('\n📝 Next Steps:');
        console.log('1. Verify subjects in database');
        console.log('2. Check parent-child relationships');
        console.log('3. Run question import to map questions to subjects');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runSubjectImport();
