const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSubjectColumn() {
    try {
        console.log('🔍 Checking subjects table schema...\n');

        // Try to add the column directly
        await prisma.$executeRawUnsafe(`
            ALTER TABLE subjects 
            ADD COLUMN IF NOT EXISTS testpress_id INT UNIQUE
        `);
        console.log('✅ Added testpress_id column (if not exists)');

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_subjects_testpress_id ON subjects(testpress_id)
        `);
        console.log('✅ Added index on testpress_id');

        console.log('\n✅ Column setup complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addSubjectColumn();
