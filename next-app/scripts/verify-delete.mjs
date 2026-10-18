import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Starting delete verification...');
    try {
        // 1. Create dummy coupon
        const code = 'TESTDEL_' + Math.floor(Math.random() * 1000);
        console.log(`Creating dummy coupon: ${code}`);
        const coupon = await prisma.offers.create({
            data: {
                code: code,
                type: 'coupon',
                discount_type: 'percent',
                discount_value: 10,
                status: 'active',
                institute_id: 10
            }
        });
        console.log(`Created ID: ${coupon.id}, Status: ${coupon.status}`);

        // 2. Attempt Soft Delete
        console.log(`Attempting soft delete (update status to 'deleted')...`);
        const updated = await prisma.offers.update({
            where: { id: coupon.id },
            data: { status: 'deleted' }
        });
        console.log(`Soft Delete Result - ID: ${updated.id}, Status: ${updated.status}`);

        if (updated.status !== 'deleted') {
            throw new Error('Soft delete failed (status did not change)');
        }

        // 3. Verify it is filtered out by FindMany with condition
        const list = await prisma.offers.findMany({
            where: {
                status: { not: 'deleted' },
                code: code
            }
        });
        console.log(`FindMany (active only) count for ${code}: ${list.length}`);

        if (list.length !== 0) {
            throw new Error('Soft deleted item still appearing in list!');
        }

        // 4. Hard Delete Cleanup
        console.log('Cleaning up (Hard Delete)...');
        await prisma.offers.delete({ where: { id: coupon.id } });
        console.log('Cleanup complete.');

    } catch (e) {
        console.error('VERIFICATION FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
