const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing via process.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
].map(state => ({ label: state, value: state }));

async function updateStateField() {
    console.log('Updating State field to dropdown...');

    const { data: field, error: fetchError } = await supabase
        .from('registration_fields')
        .select('id')
        .eq('field_key', 'state')
        .single();

    if (fetchError) {
        console.error('Error fetching state field:', fetchError);
        return;
    }

    if (!field) {
        console.error('State field not found!');
        return;
    }

    const { error: updateError } = await supabase
        .from('registration_fields')
        .update({
            field_type: 'select',
            field_options: INDIAN_STATES
        })
        .eq('id', field.id);

    if (updateError) {
        console.error('Error updating state field:', updateError);
    } else {
        console.log('Successfully updated State field to dropdown with Indian states.');
    }
}

updateStateField();
