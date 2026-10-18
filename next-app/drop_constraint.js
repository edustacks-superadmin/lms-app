require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dropConstraint() {
    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
            ALTER TABLE public.members 
            DROP CONSTRAINT IF EXISTS members_role_check;
        `;

        console.log('Executing:', query);
        await client.query(query);
        console.log('Successfully dropped members_role_check constraint');

    } catch (err) {
        console.error('Error executing script:', err);
    } finally {
        await client.end();
    }
}

dropConstraint();
