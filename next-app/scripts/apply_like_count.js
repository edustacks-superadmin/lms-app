
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Attempting to add like_count column to posts table...');
        await prisma.$executeRaw`ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;`;
        console.log('Column added or already exists.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
