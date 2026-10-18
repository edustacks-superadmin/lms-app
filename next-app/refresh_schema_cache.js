
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Refreshing Supabase schema cache...');
    try {
        await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload config';");
        console.log('Schema cache reload signal sent.');
    } catch (e) {
        console.error('Error refreshing schema:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
