import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Tq3mKqJrkwcF5A';
const DEFAULT_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'VbHg1p6oW8vTsM2tHWgIAX7G';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        let { amount, currency = 'INR', receipt, notes, isTest, instituteId, productId, productIds, items, isCart, userId, userEmail, couponCode } = body;

        const effectiveProductIds = Array.isArray(productIds) ? productIds : (productId ? [productId] : []);
        const effectiveProductId = productId || (effectiveProductIds.length > 0 ? effectiveProductIds[0] : null) || notes?.productId || notes?.product_id;
        const effectiveUserEmail = userEmail || notes?.userEmail || notes?.user_email;

        // If amount is not provided, try fetching from product
        if ((!amount || isNaN(amount)) && effectiveProductId) {
            try {
                const { data: prod } = await supabase
                    .from('products')
                    .select('price, institute_id, is_active')
                    .eq('id', effectiveProductId)
                    .maybeSingle();

                if (prod && prod.is_active === false) {
                    return res.status(400).json({ error: 'This package is currently inactive and cannot be purchased.' });
                }

                if (prod && prod.price) {
                    amount = Math.round(Number(prod.price) * 100);
                    if (!instituteId && prod.institute_id) {
                        instituteId = prod.institute_id;
                    }
                }
            } catch (err) {
                console.warn('[create-order] Error looking up product:', err.message);
            }
        }

        // If amount is not provided or invalid
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const amountInPaise = Math.round(Number(amount));
        if (amountInPaise < 100) {
            return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
        }

        let keyId = DEFAULT_KEY_ID;
        let keySecret = DEFAULT_KEY_SECRET;
        const effectiveInstituteId = instituteId || notes?.instituteId || 10;

        // If not explicit test, check if institute has specific credentials
        if (!isTest && effectiveInstituteId) {
            try {
                const { data } = await supabase
                    .from('institute_settings')
                    .select('razorpay_key_id, razorpay_key_secret')
                    .eq('id', effectiveInstituteId)
                    .maybeSingle();

                if (data?.razorpay_key_id && data?.razorpay_key_secret) {
                    keyId = data.razorpay_key_id;
                    keySecret = data.razorpay_key_secret;
                }
            } catch (dbErr) {
                console.warn('[create-order] Could not fetch institute keys from db, using default:', dbErr.message);
            }
        }

        if (!keyId || !keySecret) {
            return res.status(500).json({ error: 'Razorpay credentials not configured' });
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });

        const options = {
            amount: amountInPaise,
            currency: currency.toUpperCase(),
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: {
                productId: effectiveProductId ? String(effectiveProductId) : '',
                productIds: effectiveProductIds.join(','),
                isCart: String(Boolean(isCart || effectiveProductIds.length > 1)),
                userId: userId || '',
                userEmail: effectiveUserEmail || '',
                instituteId: effectiveInstituteId || '',
                ...(notes || {})
            }
        };

        const order = await razorpay.orders.create(options);

        // Record order in Supabase orders table with pending status
        let dbOrderId = null;
        try {
            // Find member integer id if possible
            let memberId = null;
            if (effectiveUserEmail) {
                const { data: mem } = await supabase
                    .from('members')
                    .select('id')
                    .ilike('email', effectiveUserEmail)
                    .maybeSingle();
                if (mem) memberId = mem.id;
            }

            const paymentNotesObj = {
                is_cart: Boolean(isCart || effectiveProductIds.length > 1),
                product_ids: effectiveProductIds.map(Number),
                items: items || []
            };

            const { data: dbOrder } = await supabase
                .from('orders')
                .insert({
                    user_id: memberId || (typeof userId === 'number' ? userId : null),
                    user_email: effectiveUserEmail || null,
                    product_id: effectiveProductId ? Number(effectiveProductId) : null,
                    amount: amountInPaise / 100,
                    original_price: amountInPaise / 100,
                    discount_amount: 0,
                    coupon_code: couponCode || null,
                    status: 'pending',
                    payment_method: 'razorpay',
                    razorpay_order_id: order.id,
                    institute_id: effectiveInstituteId || 10,
                    payment_notes: JSON.stringify(paymentNotesObj),
                    created_at: new Date().toISOString()
                })
                .select('id')
                .maybeSingle();

            if (dbOrder) dbOrderId = dbOrder.id;
        } catch (dbInsertErr) {
            console.warn('[create-order] Could not insert pending order into DB:', dbInsertErr.message);
        }

        return res.status(200).json({
            success: true,
            order_id: order.id,
            orderId: order.id,
            id: order.id,
            dbOrderId: dbOrderId || order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: keyId,
            keyId: keyId
        });
    } catch (error) {
        console.error('[create-order] Razorpay Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create Razorpay order'
        });
    }
}
