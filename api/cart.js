import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Authenticate user via Bearer token
        let user = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data, error } = await supabase.auth.getUser(token);
            if (!error && data?.user) {
                user = data.user;
            }
        }

        if (!user) {
            if (req.method === 'GET') {
                return res.status(200).json({ items: [], count: 0, total: 0 });
            }
            return res.status(401).json({ error: 'Please login to manage cart' });
        }

        // Find member ID
        let { data: member } = await supabase
            .from('members')
            .select('id, institute_id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (!member && user.email) {
            const { data: emailMember } = await supabase
                .from('members')
                .select('id, institute_id')
                .eq('email', user.email)
                .maybeSingle();
            member = emailMember;
        }

        if (!member) {
            return res.status(404).json({ error: 'Member profile not found' });
        }

        // GET - Fetch cart items
        if (req.method === 'GET') {
            const { data: cartItems, error: cartError } = await supabase
                .from('cart_items')
                .select('id, product_id, products(id, title, price, strikethrough_price, image, slug)')
                .eq('member_id', member.id)
                .order('created_at', { ascending: false });

            if (cartError) {
                console.error('[cart-api] GET error:', cartError);
                return res.status(500).json({ error: 'Failed to fetch cart' });
            }

            const items = (cartItems || [])
                .filter(item => item.products)
                .map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    ...item.products
                }));

            const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

            return res.status(200).json({
                items,
                count: items.length,
                total
            });
        }

        // POST - Add item to cart
        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const { productId, productIds } = body;

            if (!productId && (!productIds || !Array.isArray(productIds) || productIds.length === 0)) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            if (productId) {
                const numericId = parseInt(productId, 10);

                // Fetch product details for response message
                const { data: product } = await supabase
                    .from('products')
                    .select('id, title')
                    .eq('id', numericId)
                    .maybeSingle();

                if (!product) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                // Check if already in cart
                const { data: existing } = await supabase
                    .from('cart_items')
                    .select('id')
                    .eq('member_id', member.id)
                    .eq('product_id', numericId)
                    .maybeSingle();

                let cartItemId = existing?.id;
                if (!existing) {
                    const { data: inserted, error: insertError } = await supabase
                        .from('cart_items')
                        .insert({
                            member_id: member.id,
                            product_id: numericId,
                            institute_id: member.institute_id || 10
                        })
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error('[cart-api] Insert error:', insertError);
                        return res.status(500).json({ error: 'Failed to add item to cart' });
                    }
                    cartItemId = inserted?.id;
                }

                // Count total items
                const { count } = await supabase
                    .from('cart_items')
                    .select('id', { count: 'exact', head: true })
                    .eq('member_id', member.id);

                return res.status(200).json({
                    success: true,
                    message: `${product.title} added to cart`,
                    cartItemId,
                    count: count || 1
                });
            }

            // Bulk add
            if (productIds && Array.isArray(productIds)) {
                for (const pid of productIds) {
                    const numId = parseInt(pid, 10);
                    if (numId) {
                        await supabase
                            .from('cart_items')
                            .insert({
                                member_id: member.id,
                                product_id: numId,
                                institute_id: member.institute_id || 10
                            })
                            .catch(() => {});
                    }
                }
                return res.status(200).json({ success: true, message: 'Items added to cart' });
            }
        }

        // DELETE - Remove item from cart
        if (req.method === 'DELETE') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const { productId } = body;

            if (!productId) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            const { error: deleteError } = await supabase
                .from('cart_items')
                .delete()
                .eq('member_id', member.id)
                .eq('product_id', parseInt(productId, 10));

            if (deleteError) {
                console.error('[cart-api] DELETE error:', deleteError);
                return res.status(500).json({ error: 'Failed to remove from cart' });
            }

            return res.status(200).json({ success: true, message: 'Item removed from cart' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[cart-api] Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}
