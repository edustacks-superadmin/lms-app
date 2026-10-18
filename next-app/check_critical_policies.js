import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Critical Tables Policies...');

    const tables = ['courses', 'exams', 'questions', 'batches', 'chapters', 'members'];

    // Create a parameterized query string for IN clause
    // Prisma executeRaw/queryRaw can interpret arrays in IN clause nicely usually, or we join strings.
    // Using join for postgres.

    const policies = await prisma.$queryRaw`
    SELECT 
      tablename,
      policyname,
      cmd,
      qual::text,
      with_check::text
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('courses', 'exams', 'questions', 'batches', 'chapters', 'members')
    ORDER BY tablename, cmd;
  `;

    console.log(JSON.stringify(policies, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
