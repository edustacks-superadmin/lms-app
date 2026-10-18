const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking batch_members table...");
        const count = await prisma.batch_members.count();
        console.log(`Total rows in batch_members: ${count}`);

        if (count > 0) {
            const sample = await prisma.batch_members.findFirst();
            console.log("Sample row:", sample);

            // Checks for type of member_id
            console.log("member_id type:", typeof sample.member_id);
            console.log("batch_id type:", typeof sample.batch_id);
        } else {
            console.log("Table is empty.");
        }

        console.log("\nChecking batches table...");
        const batches = await prisma.batches.findMany({
            take: 1,
            where: {
                testpress_id: { not: null }
            },
            include: {
                _count: {
                    select: { batch_members: true }
                }
            }
        });
        console.log("Batch with testpress_id:", JSON.stringify(batches, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
