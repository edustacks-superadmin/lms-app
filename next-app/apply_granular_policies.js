
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Tables and their corresponding Resource ID in the RBAC system
const POLICY_CONFIG = [
    // Courses & Exams Resource
    { table: 'courses', resource: 'courses' },
    { table: 'chapters', resource: 'courses' },
    { table: 'subjects', resource: 'courses' },
    { table: 'exams', resource: 'courses' },
    { table: 'questions', resource: 'courses' },

    // Batch Resource
    { table: 'batches', resource: 'batch' },

    // Settings Resource
    { table: 'institute_settings', resource: 'settings' },
    { table: 'banner_ads', resource: 'settings' },
    { table: 'home_settings', resource: 'settings' },

    // Posts Resource
    { table: 'post_batches', resource: 'posts' }
];

async function applyPolicies() {
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL not found in .env.local');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        for (const { table, resource } of POLICY_CONFIG) {
            console.log(`Processing table: ${table} (Resource: ${resource})`);

            // 1. Enable RLS
            await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);

            // 2. Drop existing permissive permissions (audit list)
            // Common names: "Enable read access for all users", "Enable insert for authenticated users only", etc.
            // We'll just drop by specific names if we know them, or better, query and drop all except our new ones?
            // For safety, let's just drop the ones we are about to create to ensure idempotency, 
            // AND specifically drop the "dangerous" ones we found earlier if we can guess their names.
            // But since names vary, best practice for this "Strict Mode" is to drop ALL policies and re-add.
            // CAUTION: This removes custom logic. 
            // Given the requirement is "Strict RLS", a clean slate for these tables is safer.

            // Fetch existing policies
            const res = await client.query(`
                SELECT policyname 
                FROM pg_policies 
                WHERE tablename = $1 AND schemaname = 'public'
            `, [table]);

            for (const row of res.rows) {
                console.log(`  - Dropping policy: "${row.policyname}"`);
                await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON public.${table};`);
            }

            // 3. Create Public Read Policy
            // "Can View" permission is interesting. Usually public data (courses) is readable by everyone?
            // Or should we strict check 'view' permission? 
            // Requirement says "Admin-Only Write RLS". Implicitly Read is usually public for LMS or authenticated.
            // Let's assume Authenticated Read for now, OR Public Read if it was public before.
            // The plan says: `CREATE POLICY "Public Read" ON <table> FOR SELECT USING (true);`
            console.log(`  + Creating Public Read Policy`);
            await client.query(`
                CREATE POLICY "Public Read" ON public.${table} 
                FOR SELECT USING (true);
            `);

            // 4. Create RBAC Write Policies (INSERT, UPDATE, DELETE)

            // INSERT -> 'add' permission
            console.log(`  + Creating RBAC Insert Policy`);
            await client.query(`
                CREATE POLICY "RBAC Insert" ON public.${table} 
                FOR INSERT 
                WITH CHECK (public.check_permission('${resource}', 'add'));
            `);

            // UPDATE -> 'change' permission
            console.log(`  + Creating RBAC Update Policy`);
            await client.query(`
                CREATE POLICY "RBAC Update" ON public.${table} 
                FOR UPDATE 
                USING (public.check_permission('${resource}', 'change'))
                WITH CHECK (public.check_permission('${resource}', 'change'));
            `);

            // DELETE -> 'delete' permission
            console.log(`  + Creating RBAC Delete Policy`);
            await client.query(`
                CREATE POLICY "RBAC Delete" ON public.${table} 
                FOR DELETE 
                USING (public.check_permission('${resource}', 'delete'));
            `);
        }

        console.log('All policies applied successfully.');

    } catch (err) {
        console.error('Error applying policies:', err);
    } finally {
        await client.end();
    }
}

applyPolicies();
