const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRaw`
      SELECT user_id FROM subscriptions WHERE user_id IS NOT NULL LIMIT 10
    `;
        console.log(JSON.stringify(result, null, 2));

        const count = await prisma.$queryRaw`
      SELECT count(*) FROM subscriptions WHERE user_id IS NOT NULL
    `;
        console.log("Count:", count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
