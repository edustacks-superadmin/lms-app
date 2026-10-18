const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    try {
        const sqlPath = path.join(__dirname, '..', 'migrations', 'fix_chapters_index.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration from:', sqlPath);

        const queries = sqlContent
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await prisma.$executeRawUnsafe(query);
        }

        console.log('Index fixed.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
