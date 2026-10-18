const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
    try {
        const products = await prisma.products.findMany({
            orderBy: { created_at: 'desc' },
            take: 5
        });
        console.log('Recent products:', JSON.stringify(products, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProducts();
