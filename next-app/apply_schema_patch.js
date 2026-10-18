
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Applying schema patch safely...');

    try {
        // 1. Add special_category
        await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_exam_results' AND column_name='special_category') THEN
              ALTER TABLE public.external_exam_results ADD COLUMN special_category TEXT;
              RAISE NOTICE 'Added special_category column';
          ELSE
              RAISE NOTICE 'special_category column already exists';
          END IF;
      END
      $$;
    `);

        // 2. Add special_category_rank
        await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_exam_results' AND column_name='special_category_rank') THEN
              ALTER TABLE public.external_exam_results ADD COLUMN special_category_rank INTEGER;
              RAISE NOTICE 'Added special_category_rank column';
          ELSE
              RAISE NOTICE 'special_category_rank column already exists';
          END IF;
      END
      $$;
    `);

        console.log('Schema patch applied successfully.');
    } catch (e) {
        console.error('Error applying patch:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
