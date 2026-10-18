const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking for commission_percent column...');

        // Attempt to add the column manually using raw SQL
        // This bypasses Prisma Schema drift issues
        console.log('Altering table offers...');

        await prisma.$executeRaw`
      ALTER TABLE "offers" 
      ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "commission_fixed" DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "influencer_id" INTEGER;
    `;

        console.log('Columns added successfully.');

    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
