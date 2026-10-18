
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const content = await prisma.chapter_contents.findUnique({
        where: { id: 1420 },
    });
    console.log(JSON.stringify(content, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
