import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const batches = await prisma.batches.findMany({
            where: {
                testpress_id: {
                    not: null
                }
            },
            take: 10,
            select: {
                testpress_id: true,
                name: true
            }
        });

        console.log("Found batches:", JSON.stringify(batches, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
