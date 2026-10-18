import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSql() {
    const sqlPath = path.join(__dirname, 'migrations', 'add_instant_feedback_to_exams.sql')
    console.log(`Reading migration file from: ${sqlPath}`)
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Executing SQL...')
    // Try exec_sql RPC
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
        console.error('Error executing SQL via RPC:', error)
        console.log('Falling back to manual instruction. Please run the SQL in the editor.')
        process.exit(1)
    } else {
        console.log('✅ SQL executed successfully')
    }
}

runSql();
