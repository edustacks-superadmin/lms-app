const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        console.log('Adding is_primary column...');
        await client.query(`
      ALTER TABLE exam_configurations 
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
    `);

        console.log('Migration successful: is_primary column available.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
