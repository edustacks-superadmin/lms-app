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

async function fetchQuestions(token, page = 1, pageSize = 10) {
    // Use direct admin/questions API which includes full question data with IDs
    const url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/questions/?page=${page}&page_size=${pageSize}`;
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
        let subject = await prisma.subjects.findUnique({
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

async function importQuestions(questions, folderId) {
    console.log(`\n📊 Processing ${questions.length} questions...\n`);

    // Save sample JSON for inspection
    fs.writeFileSync('test_questions_sample_extended.json', JSON.stringify(questions[0], null, 2));
    console.log('💾 Saved sample question to test_questions_sample_extended.json\n');

    let imported = 0;
    let skipped = 0;

    for (const tpQuestion of questions) {
        try {
            console.log(`Processing Question ID ${tpQuestion.id || 'UNKNOWN'}...`);

            // Handle subject
            let subjectId = null;
            if (tpQuestion.subject || tpQuestion.subject_name) {
                const subjectName = tpQuestion.subject_name || tpQuestion.subject?.name || tpQuestion.subject;
                const subjectTestpressId = tpQuestion.subject_id || tpQuestion.subject?.id;
                const subject = await getOrCreateSubject(subjectName, subjectTestpressId);
                subjectId = subject?.id;
            }

            // Map fields - try multiple possible field names
            const questionData = {
                testpress_id: tpQuestion.id,
                question_text: tpQuestion.question_html || tpQuestion.text || tpQuestion.question || '',
                answer: tpQuestion.correct_answer || null,
                explanation: tpQuestion.explanation_html || tpQuestion.explanation || tpQuestion.solution || null,
                difficulty_level: tpQuestion.difficulty || null,
                subject_id: subjectId,
                // Extended fields
                question_type: tpQuestion.question_type || tpQuestion.type || null,
                marks: tpQuestion.marks || tpQuestion.positive_marks || null,
                negative_marks: tpQuestion.negative_marks || null,
                hint1: tpQuestion.hint1 || tpQuestion.hint1_html || null,
                hint2: tpQuestion.hint2 || tpQuestion.hint2_html || null,
                case_sensitive: tpQuestion.case_sensitive || false,
                show_explanation_only_after: tpQuestion.show_explanation_only_after_attempt || false,
                institute_id: 10
            };

            // Upsert question
            const question = await prisma.questions.upsert({
                where: { testpress_id: tpQuestion.id },
                update: questionData,
                create: questionData
            });

            console.log(`  ✅ Question ${question.id} (testpress: ${tpQuestion.id})`);
            if (subjectId) console.log(`     Subject: ${subjectId}`);

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
                                option_text: opt.text_html || opt.text || opt.answer || opt,
                                is_correct: opt.is_correct || false,
                                option_order: i + 1,
                                institute_id: 10
                            }
                        });
                    }
                    console.log(`  📝 Added ${options.length} options`);
                }
            }

            // Handle tags if they exist
            if (tpQuestion.tags && Array.isArray(tpQuestion.tags)) {
                for (const tag of tpQuestion.tags) {
                    const tagName = typeof tag === 'string' ? tag : tag.name;
                    if (tagName) {
                        await prisma.question_tags.upsert({
                            where: {
                                question_id_tag_name: {
                                    question_id: question.id,
                                    tag_name: tagName
                                }
                            },
                            update: {},
                            create: {
                                question_id: question.id,
                                tag_name: tagName,
                                institute_id: 10
                            }
                        });
                    }
                }
                console.log(`  🏷️  Added ${tpQuestion.tags.length} tags`);
            }

            // Link to folder (optional - only if folder ID provided)
            if (folderId) {
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
        console.log('🚀 Phase 1: Enhanced Test Question Import\n');
        console.log(`📊 Max Questions: ${MAX_QUESTIONS}\n`);

        const token = await getTestpressToken();
        console.log('✅ Authenticated\n');

        const questions = await fetchQuestions(token, 1, MAX_QUESTIONS);
        console.log(`✅ Fetched ${questions.length} questions\n`);

        if (questions.length === 0) {
            console.log('⚠️  No questions found.');
            return;
        }

        const { imported, skipped } = await importQuestions(questions, null);

        console.log('\n' + '='.repeat(50));
        console.log('📈 IMPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Imported: ${imported}`);
        console.log(`⚠️  Skipped:  ${skipped}`);
        console.log(`📁 Total:    ${questions.length}`);
        console.log('='.repeat(50));

        console.log('\n📝 Next Steps:');
        console.log('1. Review test_questions_sample_extended.json to verify field mapping');
        console.log('2. Check questions table in database for new fields');
        console.log('3. Verify question_options, question_tags, and subjects');
        console.log('4. If all looks good, proceed with full import');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

runTestImport();
