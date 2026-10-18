const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const https = require('https');

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

async function importQuestions(questions) {
    console.log(`\n📊 Processing ${questions.length} questions...\n`);

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < questions.length; i++) {
        const tpQuestion = questions[i];

        try {
            const questionText = tpQuestion.question_html || tpQuestion.text || '';

            console.log(`Processing Question ${i + 1}/${questions.length}...`);

            // Check if question already exists by exact question_text match
            const existing = await prisma.$queryRaw`
                SELECT id FROM questions WHERE question_text = ${questionText} LIMIT 1
            `;

            let questionId;
            if (existing && existing.length > 0) {
                console.log(`  ♻️  Question already exists (ID: ${existing[0].id}), updating...`);
                questionId = existing[0].id;

                // Update existing
                await prisma.$executeRaw`
                    UPDATE questions 
                    SET explanation = ${tpQuestion.explanation_html || tpQuestion.explanation || null},
                        updated_at = NOW()
                    WHERE id = ${questionId}
                `;
                skipped++;
            } else {
                // Create new question
                const result = await prisma.$queryRaw`
                    INSERT INTO questions (question_text, explanation, difficulty_level, institute_id, created_at, updated_at)
                    VALUES (${questionText}, ${tpQuestion.explanation_html || tpQuestion.explanation || null}, 
                            ${tpQuestion.difficulty || null}, 10, NOW(), NOW())
                    RETURNING id
                `;
                questionId = result[0].id;
                console.log(`  ✅ Created question ID ${questionId}`);
                imported++;
            }

            // Handle options
            if (tpQuestion.answers && Array.isArray(tpQuestion.answers)) {
                // Delete existing options
                await prisma.$executeRaw`
                    DELETE FROM question_options WHERE question_id = ${questionId}
                `;

                // Create options
                for (let j = 0; j < tpQuestion.answers.length; j++) {
                    const opt = tpQuestion.answers[j];
                    await prisma.$executeRaw`
                        INSERT INTO question_options (question_id, option_label, option_text, is_correct, option_order, institute_id, created_at)
                        VALUES (${questionId}, ${String.fromCharCode(65 + j)}, ${opt.text_html || opt.text || ''}, 
                                ${opt.is_correct || false}, ${j + 1}, 10, NOW())
                    `;
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
        console.log('🚀 Minimal Question Import (Core Fields Only)\n');
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

        const { imported, skipped, errors } = await importQuestions(questions);

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Imported: ${imported}`);
        console.log(`♻️  Updated:  ${skipped}`);
        console.log(`❌ Errors:   ${errors.length}`);
        console.log(`📁 Total:    ${questions.length}`);
        console.log('='.repeat(50));

        if (errors.length > 0) {
            console.log('\n⚠️  Errors:');
            errors.forEach(e => {
                console.log(`   Question ${e.index}: ${e.error}`);
            });
        }

        console.log('\n✅ Import complete!');
        console.log('   Check the questions and question_options tables to verify.');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runImport();
