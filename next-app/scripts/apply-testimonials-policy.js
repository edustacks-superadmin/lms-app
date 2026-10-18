const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

async function applyTestimonialsPolicy() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing in environment variables.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const sql = `
    ALTER TABLE IF EXISTS public.testimonials ENABLE ROW LEVEL SECURITY;

    DO $$ 
    BEGIN
        -- SELECT
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Enable read access for all users'
        ) THEN
            CREATE POLICY "Enable read access for all users" ON public.testimonials FOR SELECT USING (true);
        END IF;

        -- INSERT
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Enable insert for authenticated users'
        ) THEN
            CREATE POLICY "Enable insert for authenticated users" ON public.testimonials FOR INSERT TO authenticated WITH CHECK (true);
        END IF;

        -- UPDATE
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Enable update for authenticated users'
        ) THEN
            CREATE POLICY "Enable update for authenticated users" ON public.testimonials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;

        -- DELETE
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Enable delete for authenticated users'
        ) THEN
            CREATE POLICY "Enable delete for authenticated users" ON public.testimonials FOR DELETE TO authenticated USING (true);
        END IF;
    END $$;
    `;

    try {
        await client.connect();
        console.log('Connected to database. Applying policies...');
        await client.query(sql);
        console.log('✅ Successfully applied RLS policies for `testimonials` table.');
    } catch (err) {
        console.error('Error applying policies:', err);
    } finally {
        await client.end();
    }
}

applyTestimonialsPolicy();
