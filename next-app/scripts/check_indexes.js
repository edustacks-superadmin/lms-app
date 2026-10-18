const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking indexes on chapters table...");
        const result = await prisma.$queryRaw`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'chapters';
        `;
        console.log(result);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
