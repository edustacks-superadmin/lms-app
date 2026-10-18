import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to serialize BigInt
const replacer = (key, value) =>
    typeof value === 'bigint' ? value.toString() : value;

async function main() {
    try {
        const batch = await prisma.batches.findFirst({
            where: {
                testpress_id: 167
            }
        });

        console.log("Found batch 167:", JSON.stringify(batch, replacer, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
