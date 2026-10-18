const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding metadata column to resources table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS metadata json;`);
        console.log('Column added successfully.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
