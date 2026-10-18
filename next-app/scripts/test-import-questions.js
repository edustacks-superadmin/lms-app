const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');

const prisma = new PrismaClient();

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;
const TEST_FOLDER_ID = 2491; // Small folder for testing
const MAX_QUESTIONS = 10; // Only import 10 questions for testing

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

async function importQuestions(questions, folderId) {
    console.log(`\n📊 Processing ${questions.length} questions...\n`);

    // Save sample JSON for inspection
    fs.writeFileSync('test_questions_sample.json', JSON.stringify(questions[0], null, 2));
    console.log('💾 Saved sample question to test_questions_sample.json\n');

    let imported = 0;
    let skipped = 0;

    for (const tpQuestion of questions) {
        try {
            console.log(`Processing Question ID ${tpQuestion.id}...`);

            // Map fields (adjust based on actual API structure)
            const questionData = {
                testpress_id: tpQuestion.id,
                question_text: tpQuestion.question_html || tpQuestion.text || tpQuestion.question || '',
                answer: tpQuestion.correct_answer || null,
                explanation: tpQuestion.explanation || tpQuestion.solution || null,
                difficulty_level: tpQuestion.difficulty || null,
                institute_id: 10
            };

            // Upsert question
            const question = await prisma.questions.upsert({
                where: { testpress_id: tpQuestion.id },
                update: questionData,
                create: questionData
            });

            console.log(`  ✅ Question ${question.id} (testpress: ${tpQuestion.id})`);

            // Handle options if they exist
            if (tpQuestion.answers || tpQuestion.options) {
                const options = tpQuestion.answers || tpQuestion.options;

                // Delete existing options for this question
                await prisma.question_options.deleteMany({
                    where: { question_id: question.id }
                });

                // Insert new options
                if (Array.isArray(options)) {
                    for (let i = 0; i < options.length; i++) {
                        const opt = options[i];
                        await prisma.question_options.create({
                            data: {
                                question_id: question.id,
                                option_label: String.fromCharCode(65 + i), // A, B, C, D
                                option_text: opt.text || opt.answer || opt,
                                is_correct: opt.is_correct || false,
                                option_order: i + 1,
                                institute_id: 10
                            }
                        });
                    }
                    console.log(`  📝 Added ${options.length} options`);
                }
            }

            // Link to folder
            const localFolder = await prisma.question_folders.findUnique({
                where: { testpress_id: folderId }
            });

            if (localFolder) {
                await prisma.question_folder_items.upsert({
                    where: {
                        question_id_folder_id: {
                            question_id: question.id.toString(), // Convert to string for UUID field
                            folder_id: localFolder.id
                        }
                    },
                    update: {},
                    create: {
                        question_id: question.id.toString(),
                        folder_id: localFolder.id,
                        position: imported + 1,
                        institute_id: 10
                    }
                });
                console.log(`  🔗 Linked to folder ${localFolder.name}`);
            }

            imported++;
            console.log('');

        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}`);
            skipped++;
        }
    }

    return { imported, skipped };
}

async function runTestImport() {
    try {
        console.log('🚀 Phase 1: Test Question Import\n');
        console.log(`📁 Target Folder ID: ${TEST_FOLDER_ID}`);
        console.log(`📊 Max Questions: ${MAX_QUESTIONS}\n`);

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        const questions = await fetchQuestions(token, TEST_FOLDER_ID);
        console.log(`✅ Fetched ${questions.length} questions\n`);

        if (questions.length === 0) {
            console.log('⚠️  No questions found. Try a different folder ID.');
            return;
        }

        const { imported, skipped } = await importQuestions(questions, TEST_FOLDER_ID);

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Imported: ${imported}`);
        console.log(`⚠️  Skipped:  ${skipped}`);
        console.log(`📁 Total:    ${questions.length}`);
        console.log('='.repeat(50));

        console.log('\n📝 Next Steps:');
        console.log('1. Review test_questions_sample.json to verify field mapping');
        console.log('2. Check questions table in database');
        console.log('3. Verify question_options were created');
        console.log('4. Confirm question_folder_items linkage');
        console.log('5. If all looks good, proceed with full import');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runTestImport();
