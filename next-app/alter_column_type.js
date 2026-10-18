
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function patch() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Altering column special_category_rank to text...');
        await client.query('ALTER TABLE "external_exam_results" ALTER COLUMN "special_category_rank" TYPE TEXT;');

        console.log('✅ Column type updated successfully.');
    } catch (err) {
        console.error('❌ Error patching schema:', err);
    } finally {
        await client.end();
    }
}

patch();
