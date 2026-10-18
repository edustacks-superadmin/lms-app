const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    try {
        const sqlPath = path.join(__dirname, '..', 'migrations', 'add_testpress_id_to_chapters.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration from:', sqlPath);

        // Split by semicolon and filter empty statements
        const queries = sqlContent
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        for (const query of queries) {
            console.log(`Executing: ${query.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(query);
        }

        console.log('Migration completed successfully. "testpress_id" column added to "chapters" table.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
