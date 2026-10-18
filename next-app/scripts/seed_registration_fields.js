const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key to bypass RLS
if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing via process.env. Please ensure it is set in .env.local');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_FIELDS = [
    { field_label: 'Email', field_key: 'email', field_type: 'email', is_enabled: true, is_required: true, is_preset: true, display_order: 1, placeholder: 'Enter your email address' },
    { field_label: 'Username', field_key: 'username', field_type: 'text', is_enabled: true, is_required: true, is_preset: true, display_order: 2, placeholder: 'Choose a username' },
    { field_label: 'Phone Number', field_key: 'phone_number', field_type: 'tel', is_enabled: true, is_required: false, is_preset: true, display_order: 3, placeholder: 'Enter your phone number' },
    { field_label: 'Password', field_key: 'password', field_type: 'password', is_enabled: true, is_required: true, is_preset: true, display_order: 4, placeholder: 'Create a password' },
    { field_label: 'First Name', field_key: 'first_name', field_type: 'text', is_enabled: true, is_required: true, is_preset: true, display_order: 5, placeholder: 'Enter your first name' },
    { field_label: 'Last Name', field_key: 'last_name', field_type: 'text', is_enabled: true, is_required: true, is_preset: true, display_order: 6, placeholder: 'Enter your last name' },
    { field_label: 'Gender', field_key: 'gender', field_type: 'select', is_enabled: true, is_required: true, is_preset: true, field_options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }], display_order: 7, placeholder: 'Select your gender' },
    { field_label: 'Birth Date', field_key: 'birth_date', field_type: 'date', is_enabled: true, is_required: false, is_preset: true, display_order: 8, placeholder: 'Select your birth date' },
    { field_label: 'Address Line 1', field_key: 'address1', field_type: 'text', is_enabled: true, is_required: false, is_preset: true, display_order: 9, placeholder: 'Enter your street address' },
    { field_label: 'Address Line 2', field_key: 'address2', field_type: 'text', is_enabled: true, is_required: false, is_preset: true, display_order: 10, placeholder: 'Apartment, suite, unit, etc. (optional)' },
    { field_label: 'City', field_key: 'city', field_type: 'text', is_enabled: true, is_required: false, is_preset: true, display_order: 11, placeholder: 'Select your city' },
    { field_label: 'State', field_key: 'state', field_type: 'text', is_enabled: true, is_required: false, is_preset: true, display_order: 12, placeholder: 'Select your state' },
    { field_label: 'Zip Code', field_key: 'zip', field_type: 'text', is_enabled: true, is_required: false, is_preset: true, display_order: 13, placeholder: 'Enter your zip code' },
    { field_label: 'Photo', field_key: 'photo_url', field_type: 'file', is_enabled: true, is_required: false, is_preset: true, display_order: 14, placeholder: 'Upload your profile photo' },
];

async function seedFields() {
    console.log('Starting seed...');
    for (const field of DEFAULT_FIELDS) {
        // Check if exists
        const { data: existing } = await supabase
            .from('registration_fields')
            .select('id')
            .eq('field_key', field.field_key)
            .single();

        if (!existing) {
            console.log(`Inserting ${field.field_label}...`);
            const { error } = await supabase
                .from('registration_fields')
                .insert([field]);
            if (error) console.error(`Error inserting ${field.field_label}:`, error);
        } else {
            console.log(`Skipping ${field.field_label} (already exists)`);
            // Optionally update to ensure is_preset is true?
            const { error } = await supabase
                .from('registration_fields')
                .update({ is_preset: true }) // Ensure these flags are set
                .eq('id', existing.id);
        }
    }
    console.log('Seed completed.');
}

seedFields();
