const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = 1439;
    try {
        const content = await prisma.chapter_contents.findUnique({
            where: { id: id },
            select: { id: true, title: true, type: true, url: true }
        });

        console.log('SEARCH_RESULTS_START');
        if (content) {
            console.log(JSON.stringify(content, null, 2));
        } else {
            console.log(`Content with ID ${id} not found.`);
            // List some IDs to see what's available
            const recent = await prisma.chapter_contents.findMany({
                take: 10,
                orderBy: { id: 'desc' },
                select: { id: true, title: true }
            });
            console.log('Recent IDs:', JSON.stringify(recent, null, 2));
        }
        console.log('SEARCH_RESULTS_END');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
