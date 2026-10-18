const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLinkedPost() {
    try {
        console.log('Fetching a product to link...');

        // 1. Fetch a product ID (Course)
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('*')
            .limit(1);

        if (productError) throw productError;
        if (!products || products.length === 0) {
            console.log('No products found to link to.');
            return;
        }

        const product = products[0];
        console.log('Product Structure:', Object.keys(product));
        const productName = product.name || product.title || product.product_name || 'Unknown Product';
        console.log(`Linking to Product: ${productName} (ID: ${product.id})`);

        // 2. Create the Post
        const newPost = {
            title: `Linked Post for ${productName}`,
            slug: `linked-post-${product.id}-${Date.now()}`,
            summary: `This is an auto-generated post linked to the course: ${productName}.`,
            content: `<p>This content is exclusive to students of <strong>${productName}</strong>.</p>`,
            status: 'published',
            access_control: 'Restricted', // Assuming 'Restricted' or similar is used when products are involved
            allowed_products: [product.id],
            allow_comments: true,
            is_featured: false,
            publication_date: new Date().toISOString()
        };

        console.log('Creating post...', newPost);

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert([newPost])
            .select()
            .single();

        if (postError) throw postError;

        console.log('✅ Post Created Successfully!');
        console.log('Post ID:', post.id);
        console.log('Linked Products:', post.allowed_products);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

createLinkedPost();
