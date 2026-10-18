const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUrl(url, label) {
    if (!url) {
        console.log(`[${label}] No URL found.`);
        return;
    }
    console.log(`[${label}] Testing URL: "${url}"`);

    return new Promise((resolve) => {
        https.get(url, (res) => {
            console.log(`[${label}] Status Code: ${res.statusCode}`);
            console.log(`[${label}] Content-Type: ${res.headers['content-type']}`);
            console.log(`[${label}] Content-Length: ${res.headers['content-length']}`);
            res.resume();
            resolve();
        }).on('error', (e) => {
            console.error(`[${label}] Error: ${e.message}`);
            resolve();
        });
    });
}

async function checkSingleUrls() {
    console.log('--- Verifying Single Image URLs ---');

    // 1. Post
    const { data: posts } = await supabase
        .from('posts')
        .select('title, cover_image')
        .order('created_at', { ascending: false })
        .limit(1);

    if (posts && posts.length > 0) {
        await verifyUrl(posts[0].cover_image, 'Post');
    }

    // 2. Product
    const { data: products } = await supabase
        .from('products')
        .select('title, image')
        .order('created_at', { ascending: false })
        .limit(1);

    if (products && products.length > 0) {
        await verifyUrl(products[0].image, 'Product');
    }

    // 3. Banner
    const { data: banners } = await supabase
        .from('banner_ads')
        .select('title, image_url')
        .limit(1);

    if (banners && banners.length > 0) {
        await verifyUrl(banners[0].image_url, 'Banner');
    }
}

checkSingleUrls();
