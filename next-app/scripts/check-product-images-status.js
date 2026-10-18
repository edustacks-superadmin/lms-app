
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const supabaseCount = await prisma.products.count({
            where: { image: { contains: 'supabase' } },
        });

        const r2Count = await prisma.products.count({
            where: { image: { contains: 'r2.dev' } }
        });

        const totalWithImage = await prisma.products.count({
            where: { image: { not: null } }
        });

        console.log(`Found ${supabaseCount} products using Supabase images.`);
        console.log(`Found ${r2Count} products using R2 images.`);
        console.log(`Total products with images: ${totalWithImage}`);

    } catch (error) {
        console.error('Error checking products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
