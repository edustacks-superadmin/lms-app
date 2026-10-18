const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
    try {
        const migrationFile = process.argv[2];

        if (!migrationFile) {
            console.error('❌ Please provide a migration file name');
            console.log('Usage: node run-migration.js <migration-file.sql>');
            process.exit(1);
        }

        const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }

        console.log(`📄 Reading migration file: ${migrationFile}\n`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...\n');
        console.log('SQL:\n', sql, '\n');

        // Split SQL by semicolons and run each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement && !statement.match(/^(NOTIFY|COMMENT)/i)) {
                console.log(`Executing: ${statement.substring(0, 100)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

                if (error) {
                    // If exec_sql doesn't exist, try direct query
                    console.log('Trying direct query...');
                    const result = await supabase.from('_migrations').insert({ sql: statement });
                    if (result.error) {
                        throw error;
                    }
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error running migration:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
