const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    console.log('Running migration: add_testpress_to_folders.sql');
    try {
        const sqlPath = path.join(__dirname, '..', 'migrations', 'add_testpress_to_folders.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute raw SQL
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
