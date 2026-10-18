const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImageUrls() {
    console.log('--- Checking Image URLs (JSON) ---');

    const results = {};

    // 1. Check Recent Posts
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, cover_image, icon')
        .order('created_at', { ascending: false })
        .limit(2);

    if (postsError) results.postsError = postsError;
    else results.posts = posts;

    // 2. Check Products
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, image')
        .order('created_at', { ascending: false })
        .limit(2);

    if (productsError) results.productsError = productsError;
    else results.products = products;

    // 3. Check Banner Ads - using select('*') to see available columns
    const { data: banners, error: bannersError } = await supabase
        .from('banner_ads')
        .select('*')
        .limit(2);

    if (bannersError) results.bannersError = bannersError;
    else results.banners = banners;

    console.log(JSON.stringify(results, null, 2));
}

checkImageUrls();
