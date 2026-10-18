const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const crypto = require('crypto');

const prisma = new PrismaClient();

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;
const TEST_FOLDER_ID = 2491;
const MAX_QUESTIONS = 10;

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

async function fetchQuestions(token, folderId) {
    const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/${folderId}/questions/?page_size=${MAX_QUESTIONS}`;
    console.log(`📥 Fetching questions from: ${url}`);

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: { 'Authorization': `JWT ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const data = JSON.parse(body);
                    resolve(data.results || []);
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

// Generate a hash to use as a unique identifier for questions without IDs
function generateQuestionHash(questionText) {
    return crypto.createHash('md5').update(questionText).digest('hex').substring(0, 8);
}

async function importQuestions(questions, folderId) {
    console.log(`\n📊 Processing ${questions.length} questions...\n`);

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < questions.length; i++) {
        const tpQuestion = questions[i];

        try {
            const questionText = tpQuestion.question_html || tpQuestion.text || '';
            const questionHash = generateQuestionHash(questionText);

            console.log(`Processing Question ${i + 1}/${questions.length} (hash: ${questionHash})...`);

            // Check if question already exists by question_text
            const existing = await prisma.questions.findFirst({
                where: { question_text: questionText }
            });

            let question;
            if (existing) {
                console.log(`  ♻️  Question already exists (ID: ${existing.id}), skipping...`);
                question = existing;
                skipped++;
            } else {
                // Create new question (no testpress_id since API doesn't provide it)
                question = await prisma.questions.create({
                    data: {
                        question_text: questionText,
                        explanation: tpQuestion.explanation_html || tpQuestion.explanation || null,
                        difficulty_level: tpQuestion.difficulty || null,
                        institute_id: 10
                    }
                });
                console.log(`  ✅ Created question ID ${question.id}`);
                imported++;
            }

            // Handle options
            if (tpQuestion.answers && Array.isArray(tpQuestion.answers)) {
                // Delete existing options
                await prisma.question_options.deleteMany({
                    where: { question_id: question.id }
                });

                // Create options
                for (let j = 0; j < tpQuestion.answers.length; j++) {
                    const opt = tpQuestion.answers[j];
                    await prisma.question_options.create({
                        data: {
                            question_id: question.id,
                            option_label: String.fromCharCode(65 + j),
                            option_text: opt.text_html || opt.text || '',
                            is_correct: opt.is_correct || false,
                            option_order: j + 1,
                            institute_id: 10
                        }
                    });
                }
                console.log(`  📝 Added ${tpQuestion.answers.length} options`);
            }

        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}`);
            errors.push({ index: i + 1, error: error.message });
        }
    }

    return { imported, skipped, errors };
}

async function runImport() {
    try {
        console.log('🚀 Question Import (Without IDs)\n');
        console.log(`📁 Source: Question Set ${TEST_FOLDER_ID}`);
        console.log(`📊 Max Questions: ${MAX_QUESTIONS}\n`);

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        const questions = await fetchQuestions(token, TEST_FOLDER_ID);
        console.log(`✅ Fetched ${questions.length} questions\n`);

        if (questions.length === 0) {
            console.log('⚠️  No questions found.');
            return;
        }

        const { imported, skipped, errors } = await importQuestions(questions, TEST_FOLDER_ID);

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Imported: ${imported}`);
        console.log(`♻️  Skipped:  ${skipped}`);
        console.log(`❌ Errors:   ${errors.length}`);
        console.log(`📁 Total:    ${questions.length}`);
        console.log('='.repeat(50));

        if (errors.length > 0) {
            console.log('\n⚠️  Errors:');
            errors.forEach(e => {
                console.log(`   Question ${e.index}: ${e.error}`);
            });
        }

        console.log('\n📝 Note:');
        console.log('   - Questions imported without Testpress IDs (API doesn\'t provide them)');
        console.log('   - Duplicates detected by matching question_text');
        console.log('   - Check questions table to verify import');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runImport();
