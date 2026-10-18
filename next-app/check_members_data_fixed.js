const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const sample = await prisma.members.findFirst({
            select: {
                id: true,
                email: true,
                photo_url: true,
                custom_data: true // Check if other images are stored in JSON
            }
        });

        // Handle BigInt serialization
        const safeSample = JSON.parse(JSON.stringify(sample, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        console.log('Sample member data:', JSON.stringify(safeSample, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
