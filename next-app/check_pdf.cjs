const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const content = await prisma.chapter_contents.findFirst({
            where: { type: 'pdf' },
            select: { id: true, title: true, url: true }
        });

        if (content) {
            console.log('PDF_DIAGNOSTIC_DATA_START');
            console.log(JSON.stringify(content, null, 2));
            console.log('PDF_DIAGNOSTIC_DATA_END');
        } else {
            console.log('No PDF content found in the database.');
        }
    } catch (error) {
        console.error('Error fetching PDF content:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
