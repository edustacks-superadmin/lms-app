const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContent() {
    const content = await prisma.chapter_contents.findUnique({
        where: { id: 184 },
        select: { id: true, title: true, url: true, type: true }
    });

    console.log('Content 184:', JSON.stringify(content, null, 2));
    await prisma.$disconnect();
}

checkContent();
