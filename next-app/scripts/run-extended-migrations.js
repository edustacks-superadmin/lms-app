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
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (const statement of statements) {
        if (statement) {
            try {
                await prisma.$executeRawUnsafe(statement);
            } catch (error) {
                // Ignore "already exists" errors
                if (!error.message.includes('already exists')) {
                    throw error;
                }
            }
        }
    }
}

async function runExtendedMigrations() {
    try {
        console.log('🚀 Running Extended Question Field Migrations...\n');

        // Migration 4: Add extended question fields
        console.log('1️⃣  Adding extended question fields (type, marks, hints)...');
        const migration4 = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', 'add_extended_question_fields.sql'),
            'utf8'
        );
        await executeSQLStatements(migration4);
        console.log('   ✅ Extended question fields added\n');

        // Migration 5: Add testpress_id to subjects
        console.log('2️⃣  Adding testpress_id to subjects table...');
        const migration5 = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', 'add_testpress_id_to_subjects.sql'),
            'utf8'
        );
        await executeSQLStatements(migration5);
        console.log('   ✅ testpress_id added to subjects\n');

        console.log('🎉 All extended migrations completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Run: npx prisma generate');
        console.log('   2. Verify schema changes');
        console.log('   3. Proceed with question import');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runExtendedMigrations();
