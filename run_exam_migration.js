import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
    console.log('🔄 Running Exam Fields Migration...\n');

    // Read the SQL file
    const sql = fs.readFileSync('migrations/add_exam_fields.sql', 'utf-8');

    // Split into individual statements (excluding comments)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`Found ${statements.length} SQL statements to execute.\n`);

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;

        console.log(`Executing statement ${i + 1}...`);
        console.log(statement.substring(0, 100) + '...\n');

        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            console.log('\nNote: Some errors are expected (e.g., "column already exists")');
        } else {
            console.log(`✅ Statement ${i + 1} executed successfully\n`);
        }
    }

    console.log('🎉 Migration complete! Verifying changes...\n');

    // Verify the new columns exist
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error verifying:', error.message);
        return;
    }

    if (data && data.length > 0) {
        const fields = Object.keys(data[0]);
        console.log('✅ Exam table now has these fields:');
        console.log(fields.join(', '));

        const newFields = ['show_answers', 'show_score', 'show_percentile', 'show_pass_or_fail', 'slug', 'enable_ranks'];
        console.log('\n📋 New fields verification:');
        newFields.forEach(field => {
            const exists = fields.includes(field);
            console.log(`  ${exists ? '✅' : '❌'} ${field}`);
        });
    }
}

runMigration();
