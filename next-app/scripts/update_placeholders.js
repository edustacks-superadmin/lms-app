const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing via process.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FIELD_PLACEHOLDERS = {
    'email': 'Enter your email address',
    'username': 'Choose a username',
    'phone_number': 'Enter your phone number',
    'password': 'Create a password',
    'first_name': 'Enter your first name',
    'last_name': 'Enter your last name',
    'gender': 'Select your gender',
    'birth_date': 'Select your birth date',
    'address1': 'Enter your street address',
    'address2': 'Apartment, suite, unit, etc. (optional)',
    'city': 'Select your city',
    'state': 'Select your state',
    'zip': 'Enter your zip code',
    'photo_url': 'Upload your profile photo'
};

async function updatePlaceholders() {
    console.log('Updating field placeholders...');

    for (const [key, placeholder] of Object.entries(FIELD_PLACEHOLDERS)) {
        const { error } = await supabase
            .from('registration_fields')
            .update({ placeholder })
            .eq('field_key', key);

        if (error) {
            console.error(`Error updating placeholder for ${key}:`, error);
        } else {
            console.log(`Updated placeholder for ${key} to: "${placeholder}"`);
        }
    }
    console.log('Placeholder update completed.');
}

updatePlaceholders();
