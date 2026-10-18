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

        // Add status column to posts table
        await client.query(`
            ALTER TABLE public.posts 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
        `);
        console.log('Added status column to posts table.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
