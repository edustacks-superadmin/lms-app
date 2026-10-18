const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching offers...');
        const offers = await prisma.offers.findMany({
            orderBy: { created_at: 'desc' }
        });
        console.log('Offers fetched successfully:');
        console.log(JSON.stringify(offers, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
    } catch (e) {
        console.error('Error fetching offers:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
