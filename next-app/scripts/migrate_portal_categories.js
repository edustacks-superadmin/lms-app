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

        // 1. Add portal_category column
        console.log('Adding portal_category column...');
        await client.query(`
      ALTER TABLE exam_configurations 
      ADD COLUMN IF NOT EXISTS portal_category TEXT DEFAULT NULL;
    `);

        // 2. Migrate existing 'is_primary' to 'TNPSC_AE' category
        // Assuming TNPSC_AE is the default for now based on context
        console.log('Migrating existing primary exams...');
        await client.query(`
      UPDATE exam_configurations
      SET portal_category = 'TNPSC_AE'
      WHERE is_primary = true;
    `);

        // 3. Drop is_primary column
        console.log('Dropping is_primary column...');
        await client.query(`
      ALTER TABLE exam_configurations 
      DROP COLUMN IF EXISTS is_primary;
    `);

        console.log('Migration successful: portal_category added, is_primary removed.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
