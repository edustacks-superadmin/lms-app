import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching RLS Policies...');

    const policies = await prisma.$queryRaw`
    SELECT 
      tablename,
      policyname,
      cmd,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd;
  `;

    console.log(JSON.stringify(policies, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
