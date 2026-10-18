
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

        // If institute_id is needed to point to itself
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
