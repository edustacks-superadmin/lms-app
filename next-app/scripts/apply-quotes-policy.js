const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Enable RLS
        await client.query(`ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;`);
        console.log('Enabled RLS on public.quotes');

        // Drop existing policies if any (to be safe/clean)
        await client.query(`DROP POLICY IF EXISTS "Enable read access for all users" ON public.quotes;`);
        await client.query(`DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.quotes;`);
        await client.query(`DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.quotes;`);
        await client.query(`DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.quotes;`);
        console.log('Dropped existing policies.');

        // 1. Read access for ALL users (Public)
        await client.query(`
            CREATE POLICY "Enable read access for all users"
            ON public.quotes
            FOR SELECT
            USING (true);
        `);
        console.log('Created read policy.');

        // 2. Insert access for Authenticated users
        await client.query(`
            CREATE POLICY "Enable insert for authenticated users"
            ON public.quotes
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
        `);
        console.log('Created insert policy.');

        // 3. Update access for Authenticated users
        await client.query(`
            CREATE POLICY "Enable update for authenticated users"
            ON public.quotes
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
        `);
        console.log('Created update policy.');

        // 4. Delete access for Authenticated users
        await client.query(`
            CREATE POLICY "Enable delete for authenticated users"
            ON public.quotes
            FOR DELETE
            TO authenticated
            USING (true);
        `);
        console.log('Created delete policy.');

    } catch (err) {
        console.error('Error applying policies:', err);
    } finally {
        await client.end();
    }
}

main();
