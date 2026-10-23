const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyRLS() {
  try {
    console.log('Applying RLS policies to question_reports...');

    // Drop existing policies if any
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow authenticated users to insert question_reports" ON public.question_reports;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow users to view own question_reports" ON public.question_reports;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Admins can update question_reports" ON public.question_reports;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Admins can delete question_reports" ON public.question_reports;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can create reports" ON public.question_reports;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can view their own reports" ON public.question_reports;`);

    // Ensure RLS is enabled
    await prisma.$executeRawUnsafe(`ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;`);

    // 1. INSERT policy for authenticated users
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow authenticated users to insert question_reports"
      ON public.question_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT members.id FROM public.members
          WHERE members.auth_user_id = auth.uid()
             OR members.email = (auth.jwt() ->> 'email')
        )
      );
    `);
    console.log('✅ Created INSERT policy');

    // 2. SELECT policy for authenticated users (own reports + admins see all)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow users to view own question_reports"
      ON public.question_reports
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT members.id FROM public.members
          WHERE members.auth_user_id = auth.uid()
             OR members.email = (auth.jwt() ->> 'email')
        )
        OR EXISTS (
          SELECT 1 FROM public.members
          WHERE (members.auth_user_id = auth.uid() OR members.email = (auth.jwt() ->> 'email'))
            AND members.role = 'admin'
        )
      );
    `);
    console.log('✅ Created SELECT policy');

    // 3. UPDATE policy for admins
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Admins can update question_reports"
      ON public.question_reports
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.members
          WHERE (members.auth_user_id = auth.uid() OR members.email = (auth.jwt() ->> 'email'))
            AND members.role = 'admin'
        )
      );
    `);
    console.log('✅ Created UPDATE policy');

    // 4. DELETE policy for admins
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Admins can delete question_reports"
      ON public.question_reports
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.members
          WHERE (members.auth_user_id = auth.uid() OR members.email = (auth.jwt() ->> 'email'))
            AND members.role = 'admin'
        )
      );
    `);
    console.log('✅ Created DELETE policy');

    const policies = await prisma.$queryRawUnsafe(`
      SELECT policyname, cmd, permissive, roles FROM pg_policies WHERE tablename = 'question_reports';
    `);
    console.log('Current policies on question_reports:', policies);
  } catch (e) {
    console.error('Error applying RLS:', e);
  } finally {
    await prisma.$disconnect();
  }
}

applyRLS();
