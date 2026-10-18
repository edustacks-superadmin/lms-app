
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, 'next-app', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    try {
        console.log('Applying RLS fix for exam_attempts...');

        const sqlPath = path.join(__dirname, 'migrations', 'fix_exam_attempts_rls.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Try RPC first
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('RPC Failed:', error);
            console.log('Please copy content of migrations/fix_exam_attempts_rls.sql and run in Supabase SQL Editor.');
        } else {
            console.log('Migration successfully applied via RPC!');
            console.log(data);
        }

    } catch (err) {
        console.error('Migration script error:', err);
    }
}

applyMigration();
