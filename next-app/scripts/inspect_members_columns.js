const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load envs
const envFiles = ['.env', '.env.local'];
envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file });
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in members table:", Object.keys(data[0]));
    } else {
        console.log("No data found in members table to inspect columns.");
    }
}

inspect();
