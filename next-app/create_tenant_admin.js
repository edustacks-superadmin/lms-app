
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL; // Next.js or Vite env var
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTenant() {
    console.log("Creating new tenant...");

    const newTenant = {
        name: 'Mahesh Medico Academy',
        slug: 'maheshmedicoacademy',
        description: 'Mahesh Medico Academy'
    };

    const { data, error } = await supabase
        .from('institute_settings')
        .insert([newTenant])
        .select();

    if (error) {
        console.error("Error creating tenant:", error);
    } else {
        console.log("Tenant created successfully:", data);

        // Update institute_id to point to itself
        if (data && data[0]) {
            const id = data[0].id;
            console.log(`Updating institute_id for tenant ${id}...`);
            const { error: updateError } = await supabase
                .from('institute_settings')
                .update({ institute_id: id })
                .eq('id', id);

            if (updateError) {
                console.error("Error updating institute_id:", updateError);
            } else {
                console.log("institute_id updated successfully.");
            }
        }
    }
}

createTenant();
