const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const member = await prisma.members.findFirst({
            where: { id: 13775 },
            select: { id: true, photo_url: true }
        });
        console.log(`Member 13775 Photo URL: ${member?.photo_url}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
