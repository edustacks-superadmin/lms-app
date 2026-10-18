const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function bulkAssignSubject() {
    try {
        console.log('🏷️  Bulk Subject Assignment\n');

        // Get all available subjects
        const subjects = await prisma.subjects.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });

        console.log('📚 Available Subjects:');
        subjects.forEach((s, idx) => {
            console.log(`   ${idx + 1}. ${s.name} (ID: ${s.id})`);
        });

        // Get questions without subjects
        const unmappedQuestions = await prisma.questions.findMany({
            where: { subject_id: null },
            select: {
                id: true,
                question_text: true
            },
            orderBy: { id: 'asc' }
        });

        console.log(`\n📝 Found ${unmappedQuestions.length} questions without subjects\n`);

        if (unmappedQuestions.length === 0) {
            console.log('✅ All questions already have subjects!');
            return;
        }

        // Show sample questions
        console.log('Sample questions:');
        unmappedQuestions.slice(0, 3).forEach(q => {
            const preview = q.question_text
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .substring(0, 100);
            console.log(`   - ID ${q.id}: ${preview}...`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('OPTIONS:');
        console.log('='.repeat(60));
        console.log('\n1️⃣  Assign ALL questions to ONE subject');
        console.log('   - Best if all questions are from the same topic');
        console.log('   - Fastest option\n');

        console.log('2️⃣  Assign subjects individually');
        console.log('   - Review each question and choose subject');
        console.log('   - Most accurate but time-consuming\n');

        console.log('3️⃣  Export for manual assignment');
        console.log('   - Generates CSV file for bulk editing');
        console.log('   - Can assign in spreadsheet, then re-import\n');

        console.log('='.repeat(60));
        console.log('\n💡 RECOMMENDATION:');
        console.log('   Based on your question content (safety signs, tools, etc.),');
        console.log('   these appear to be from a specific subject area.');
        console.log('   Consider using Option 1 or Option 3.\n');

        console.log('📋 To proceed:');
        console.log('\n   Option 1: Run with subject ID as argument:');
        console.log('   node scripts/bulk-assign-subject.js --subject-id 15\n');

        console.log('   Option 2: Interactive mode (coming soon)\n');

        console.log('   Option 3: Export to CSV:');
        console.log('   node scripts/bulk-assign-subject.js --export\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const subjectIdArg = args.find(arg => arg.startsWith('--subject-id='));
const isExport = args.includes('--export');

if (subjectIdArg) {
    const subjectId = parseInt(subjectIdArg.split('=')[1]);
    assignAllToSubject(subjectId);
} else if (isExport) {
    exportToCSV();
} else {
    bulkAssignSubject();
}

async function assignAllToSubject(subjectId) {
    try {
        const subject = await prisma.subjects.findUnique({
            where: { id: subjectId }
        });

        if (!subject) {
            console.error(`❌ Subject ID ${subjectId} not found`);
            return;
        }

        console.log(`📚 Assigning all unmapped questions to: ${subject.name}\n`);

        const result = await prisma.questions.updateMany({
            where: { subject_id: null },
            data: { subject_id: subjectId }
        });

        console.log(`✅ Successfully mapped ${result.count} questions to "${subject.name}"`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function exportToCSV() {
    try {
        const fs = require('fs');
        const questions = await prisma.questions.findMany({
            where: { subject_id: null },
            select: { id: true, question_text: true },
            orderBy: { id: 'asc' }
        });

        let csv = 'question_id,question_preview,subject_id\n';
        questions.forEach(q => {
            const preview = q.question_text
                .replace(/<[^>]*>/g, '')
                .replace(/,/g, ';')
                .substring(0, 100);
            csv += `${q.id},"${preview}",\n`;
        });

        fs.writeFileSync('questions-to-map.csv', csv);
        console.log('✅ Exported to questions-to-map.csv');
        console.log('   1. Open in Excel/Sheets');
        console.log('   2. Fill in subject_id column');
        console.log('   3. Save and re-import');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}
