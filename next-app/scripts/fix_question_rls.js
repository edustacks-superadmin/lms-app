const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRLS() {
    try {
        console.log('--- Applying RLS policies for Question Management ---');

        const statements = [
            // 1. question_options
            `DROP POLICY IF EXISTS "Auth Question Options Manage" ON public.question_options;`,
            `CREATE POLICY "Auth Question Options Manage" ON public.question_options FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

            // 2. question_tags
            `DROP POLICY IF EXISTS "Auth Question Tags Manage" ON public.question_tags;`,
            `DROP POLICY IF EXISTS "Public Question Tags Select" ON public.question_tags;`,
            `CREATE POLICY "Public Question Tags Select" ON public.question_tags FOR SELECT TO public USING (true);`,
            `CREATE POLICY "Auth Question Tags Manage" ON public.question_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

            // 3. question_folders
            `DROP POLICY IF EXISTS "Public Question Folders Select" ON public.question_folders;`,
            `DROP POLICY IF EXISTS "Auth Question Folders Manage" ON public.question_folders;`,
            `CREATE POLICY "Public Question Folders Select" ON public.question_folders FOR SELECT TO public USING (true);`,
            `CREATE POLICY "Auth Question Folders Manage" ON public.question_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

            // 4. question_folder_items
            `DROP POLICY IF EXISTS "Public Question Folder Items Select" ON public.question_folder_items;`,
            `DROP POLICY IF EXISTS "Auth Question Folder Items Manage" ON public.question_folder_items;`,
            `CREATE POLICY "Public Question Folder Items Select" ON public.question_folder_items FOR SELECT TO public USING (true);`,
            `CREATE POLICY "Auth Question Folder Items Manage" ON public.question_folder_items FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

            // Reload schema
            `NOTIFY pgrst, 'reload schema';`
        ];

        for (const sql of statements) {
            await prisma.$executeRawUnsafe(sql);
        }

        console.log('✅ All policies created successfully and PostgREST schema reloaded!');
    } catch (e) {
        console.error('Error applying RLS:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fixRLS();
