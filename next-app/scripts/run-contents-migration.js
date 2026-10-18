const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_testpress_to_contents.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon because executeRaw might not handle multiple statements well if they are complex keys
    // But DO $$ blocks contain semicolons.
    // So simple splitting is dangerous.
    // Ideally, put each statement in separate executeRaw.
    // But the block is one statement.

    // Primitives: ALTER TABLE ... ;
    // Block: DO $$ ... $$;

    // I will execute the whole thing as one string if supported, or try to split carefully.
    // Prisma $executeRawUnsafe can often handle multiple if supported by driver, but often fails.
    // Best to split by user-defined separator or just manual logic here.

    const commands = [
        `ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS testpress_id INT`,
        `ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS description TEXT`,
        `ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false`,
        `ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS free_preview BOOLEAN DEFAULT false`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_contents_testpress_id ON chapter_contents(testpress_id)`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS testpress_id INT`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_exams_testpress_id ON exams(testpress_id)`
    ];

    // Note: I replaced the DO block with direct CREATE INDEX IF NOT EXISTS which is supported in Postgres 9.5+
    // My SQL file used DO block for safety if 'IF NOT EXISTS' syntax wasn't sufficient for indexes in older PG, but PG13+ supports it.
    // The SQL file I wrote used DO blocks.
    // I will execute the FILE content as is, but if it fails, I'll fallback to array.

    try {
        console.log('Executing migration from file...');
        await prisma.$executeRawUnsafe(sql);
        console.log('Migration completed successfully.');
    } catch (e) {
        console.log('Single execution failed. Trying statement splitting...');

        for (const cmd of commands) {
            try {
                await prisma.$executeRawUnsafe(cmd);
                console.log(`Executed: ${cmd.substring(0, 50)}...`);
            } catch (inner) {
                console.warn(`Failed: ${cmd.substring(0, 50)}... ${inner.message}`);
            }
        }
    } finally {
        await prisma.$disconnect();
    }
}

runMigration().catch(console.error);
