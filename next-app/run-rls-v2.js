const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'fix_questions_access_v2.sql');
        console.log('Reading migration from:', sqlPath);
        let sql = fs.readFileSync(sqlPath, 'utf8');

        // Better way to handle comments: strip them first or don't filter by startsWith
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0); // Don't filter startsWith('--') because it might just be the first line of a block

        console.log(`Found ${statements.length} statements.`);

        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
            try {
                await prisma.$executeRawUnsafe(statement);
            } catch (innerError) {
                // If a drop fails, maybe it's okay, but let's log it
                if (statement.toUpperCase().startsWith('DROP')) {
                    console.log('  (Drop statement failed/ignored)');
                } else {
                    throw innerError;
                }
            }
        }

        console.log('✅ Migration successful');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
