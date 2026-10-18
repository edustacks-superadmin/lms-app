const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Check columns in members table
        const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members'
    `;
        console.log('Columns in members table:', JSON.stringify(columns.map(c => c.column_name), null, 2));

        // 2. Check a few rows to see what data is in potentially relevant columns
        // We look for 'photo', 'image', or any 'url' like columns found above.
        // Based on the user's question, we want to see if we have 'large_image', 'medium_image' etc.
        // If they strictly don't exist in schema, this query might fail if we select them specifically,
        // so we'll just dump a raw sample first.
        const sample = await prisma.$queryRaw`SELECT * FROM members LIMIT 1`;
        console.log('Sample member data:', JSON.stringify(sample, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
