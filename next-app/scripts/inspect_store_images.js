require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStoreItems() {
    // Try 'courses' table first, commonly used for store items
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, thumbnail, poster') // Guessing column names
        .ilike('title', '%Mathematics QB Series%');

    if (error) {
        console.log('Error checking courses:', error.message);
    } else {
        console.log('Found in courses:', courses);
    }

    // Also check 'products' if exists
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, title, image_url, thumbnail_url') // Guessing names
        .ilike('title', '%Mathematics QB Series%');

    if (pError) {
        // console.log('Error checking products:', pError.message); 
        // Table might not exist, ignore
    } else if (products && products.length > 0) {
        console.log('Found in products:', products);
    }
}

checkStoreItems();
