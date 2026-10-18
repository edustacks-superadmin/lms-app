const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function executeSQLStatements(sql) {
    // Split by semicolon and filter out empty statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
        if (statement) {
            await prisma.$executeRawUnsafe(statement);
        }
    }
}

async function runMigrations() {
    try {
        console.log('🚀 Running Question Table Migrations...\n');

        // Migration 1: question_options UUID to Int
        console.log('1️⃣  Converting question_options.question_id to Integer...');
        const migration1 = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', 'convert_question_options_to_int.sql'),
            'utf8'
        );
        await executeSQLStatements(migration1);
        console.log('   ✅ question_options migration complete\n');

        // Migration 2: question_tags UUID to Int
        console.log('2️⃣  Converting question_tags.question_id to Integer...');
        const migration2 = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', 'convert_question_tags_to_int.sql'),
            'utf8'
        );
        await executeSQLStatements(migration2);
        console.log('   ✅ question_tags migration complete\n');

        // Migration 3: Add testpress_id to questions
        console.log('3️⃣  Adding testpress_id to questions table...');
        const migration3 = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', 'add_testpress_id_to_questions.sql'),
            'utf8'
        );
        await executeSQLStatements(migration3);
        console.log('   ✅ testpress_id column added\n');

        console.log('🎉 All migrations completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Run: npx prisma generate');
        console.log('   2. Verify schema changes');
        console.log('   3. Proceed with test question import');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigrations();
