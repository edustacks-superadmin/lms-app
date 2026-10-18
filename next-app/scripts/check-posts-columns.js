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

        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'posts' 
            ORDER BY ordinal_position;
        `);

        console.log('Posts table columns:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
