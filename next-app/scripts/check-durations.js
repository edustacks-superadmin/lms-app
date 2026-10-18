const { createClient } = require('@supabase/supabase-js');

// Load env vars manually since we're running this as a script
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.vRBcfXqkS_j8S6Z5XhYcf3r5t-Mv4u8T7V4bTjXyC9w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking content_progress columns...');

    const { data, error } = await supabase
        .from('content_progress')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data found in table, cannot infer columns directly. Checking specific columns...');
        // Fallback: Try selecting common timestamp columns
        const { data: cols, error: colError } = await supabase
            .from('content_progress')
            .select('updated_at, created_at, last_watched_at')
            .limit(1);

        if (!colError) {
            console.log('Columns likely exist: updated_at, created_at, last_watched_at');
        } else {
            console.log('Column check error:', colError.message);
        }
    }
}

checkColumns();
