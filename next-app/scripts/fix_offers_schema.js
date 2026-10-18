const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Applying schema changes manually...');

        // max_uses
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "max_uses" INTEGER;`);
            console.log('Added max_uses');
        } catch (e) { console.log('max_uses might exist or error:', e.message); }

        // per_user_limit
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "per_user_limit" INTEGER DEFAULT 1;`);
            console.log('Added per_user_limit');
        } catch (e) { console.log('per_user_limit might exist or error:', e.message); }

        // min_order_value
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "min_order_value" DECIMAL(10, 2);`);
            console.log('Added min_order_value');
        } catch (e) { console.log('min_order_value might exist or error:', e.message); }

        // influencer_name
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "influencer_name" TEXT;`);
            console.log('Added influencer_name');
        } catch (e) { console.log('influencer_name might exist or error:', e.message); }

        // usage_count
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "usage_count" INTEGER DEFAULT 0;`);
            console.log('Added usage_count');
        } catch (e) { console.log('usage_count might exist or error:', e.message); }

        // is_renewal_offer
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "is_renewal_offer" BOOLEAN DEFAULT false;`);
            console.log('Added is_renewal_offer');
        } catch (e) { console.log('is_renewal_offer might exist or error:', e.message); }

        console.log('Done.');
    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
