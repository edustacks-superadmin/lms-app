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
    console.log('🔐 Authenticating with Testpress...');

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

async function fetchQuestionDetails(token, questionSetId, page = 1) {
    const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/${questionSetId}/questions/?page=${page}&page_size=100`;
    console.log(`📥 Fetching questions page ${page} from set ${questionSetId}...`);

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

async function getOrCreateSubject(subjectName, testpressSubjectId = null) {
    if (!subjectName) return null;

    try {
        // First try to find by testpress_id if provided
        if (testpressSubjectId) {
            const existing = await prisma.subjects.findUnique({
                where: { testpress_id: testpressSubjectId }
            });
            if (existing) return existing;
        }

        // Try to find by name
        let subject = await prisma.subjects.findFirst({
            where: { name: subjectName }
        });

        if (!subject) {
            // Create new subject
            subject = await prisma.subjects.create({
                data: {
                    name: subjectName,
                    testpress_id: testpressSubjectId,
                    institute_id: 10
                }
            });
            console.log(`  📚 Created subject: ${subjectName}`);
        }

        return subject;
    } catch (error) {
        console.error(`  ⚠️  Subject error: ${error.message}`);
        return null;
    }
}

async function mapSubjectsToQuestions() {
    try {
        console.log('🚀 Subject Mapper for Imported Questions\n');

        // Get all questions without subjects
        const unmappedQuestions = await prisma.questions.findMany({
            where: { subject_id: null },
            select: { id: true, question_text: true }
        });

        console.log(`Found ${unmappedQuestions.length} questions without subjects\n`);

        if (unmappedQuestions.length === 0) {
            console.log('✅ All questions already have subjects!');
            return;
        }

        // Ask user for the question set ID to fetch from
        console.log('📝 Enter the Testpress question set ID where these questions came from:');
        console.log('   (This is the number in the URL, e.g., 2491 from /admin/question_sets/2491/)');
        console.log('   You can also find this by running: node scripts/import-gs-subjects.js\n');

        const questionSetId = process.env.TESTPRESS_QUESTION_SET_ID || 2491;  // Default
        console.log(`Using question set ID: ${questionSetId}\n`);

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        // Fetch all questions from Testpress with subject info
        let allTestpressQuestions = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetchQuestionDetails(token, questionSetId, page);
            allTestpressQuestions = allTestpressQuestions.concat(response.results || []);

            hasMore = response.next !== null;
            page++;

            if (page > 10) break; // Safety limit
        }

        console.log(`✅ Fetched ${allTestpressQuestions.length} questions from Testpress\n`);

        // Map subjects to questions
        let mapped = 0;
        let notFound = 0;
        let noSubject = 0;

        for (const localQuestion of unmappedQuestions) {
            // Try to find matching question in Testpress data
            const testpressQuestion = allTestpressQuestions.find(tq => {
                const tqText = tq.question_html || tq.text || '';
                return tqText.trim() === localQuestion.question_text.trim();
            });

            if (!testpressQuestion) {
                console.log(`⚠️  No match found for question ID ${localQuestion.id}`);
                notFound++;
                continue;
            }

            // Check if question has subject info
            const subjectName = testpressQuestion.subject_name || testpressQuestion.subject?.name;
            const subjectTestpressId = testpressQuestion.subject_id || testpressQuestion.subject?.id;

            if (!subjectName) {
                console.log(`⚠️  Question ID ${localQuestion.id} has no subject in Testpress`);
                noSubject++;
                continue;
            }

            // Get or create subject
            const subject = await getOrCreateSubject(subjectName, subjectTestpressId);

            if (subject) {
                await prisma.questions.update({
                    where: { id: localQuestion.id },
                    data: { subject_id: subject.id }
                });
                console.log(`✅ Mapped question ${localQuestion.id} to subject "${subjectName}"`);
                mapped++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 MAPPING SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully mapped:       ${mapped}`);
        console.log(`⚠️  Not found in Testpress:   ${notFound}`);
        console.log(`⚠️  No subject in Testpress:  ${noSubject}`);
        console.log(`📁 Total unmapped:            ${unmappedQuestions.length}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Mapping failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

mapSubjectsToQuestions();
