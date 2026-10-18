const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkQuestions() {
    try {
        // Check total questions
        const totalQuestions = await prisma.questions.count();
        console.log(`Total questions: ${totalQuestions}\n`);

        // Check questions with subjects
        const questionsWithSubjects = await prisma.questions.count({
            where: { subject_id: { not: null } }
        });
        console.log(`Questions with subjects: ${questionsWithSubjects}`);
        console.log(`Questions without subjects: ${totalQuestions - questionsWithSubjects}\n`);

        // Sample some questions
        const sampleQuestions = await prisma.questions.findMany({
            take: 5,
            include: {
                subjects: true
            },
            orderBy: { id: 'desc' }
        });

        console.log('Sample questions:');
        sampleQuestions.forEach(q => {
            console.log(`- ID: ${q.id}, Subject: ${q.subjects?.name || 'NONE'}, Text: ${q.question_text.substring(0, 80)}...`);
        });

        console.log('\n=== Subjects in database ===');
        const subjects = await prisma.subjects.findMany({
            take: 10,
            select: { id: true, name: true, testpress_id: true }
        });
        subjects.forEach(s => {
            console.log(`- ID: ${s.id}, Name: ${s.name}, Testpress ID: ${s.testpress_id || 'NONE'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkQuestions();
