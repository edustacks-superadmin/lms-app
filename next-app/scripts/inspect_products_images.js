require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, title, image')
        .ilike('title', '%Mathematics QB Series%')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Product Images:', products);
    }
}

checkProducts();
