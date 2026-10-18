
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRpc() {
    const sql = fs.readFileSync('create_rpc_function.sql', 'utf8');

    console.log('Applying RPC function...');

    // Use rpc call if "exec_sql" function exists (some supabase setups have this), 
    // OR simpler: just try to use a raw query if possible via a specialized function if enabled.
    // HOWEVER, Supabase JS client doesn't support raw SQL execution directly on client unless a function exists.
    // Alternatively, we can use the "postgres" connection string if available in env (DATABASE_URL) + pg library.

    // Checking if DATABASE_URL is available for direct connection, which is more reliable for DDL.
    if (process.env.DATABASE_URL) {
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            await client.query(sql);
            console.log('Successfully applied check_permission function via Postgres Client.');
            await client.end();
        } catch (err) {
            console.error('Error applying SQL via PG Client:', err);
            await client.end();
        }
    } else {
        console.error('DATABASE_URL not found. Cannot apply DDL using JS client directly without a helper.');
        console.log('Please run the contents of "create_rpc_function.sql" in your Supabase SQL Editor manually.');
    }
}

applyRpc();
