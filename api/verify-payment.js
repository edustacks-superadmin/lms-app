import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        const razorpay_order_id = body.razorpay_order_id || body.orderId || body.order_id;
        const razorpay_payment_id = body.razorpay_payment_id || body.paymentId || body.payment_id;
        const razorpay_signature = body.razorpay_signature || body.signature;
        const instituteId = body.instituteId || body.institute_id || 10;
        const dbOrderId = body.dbOrderId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                verified: false,
                error: 'Missing required payment verification fields (order_id, payment_id, signature)'
            });
        }

        const candidateSecrets = [DEFAULT_KEY_SECRET];

        if (instituteId) {
            try {
                const { data } = await supabase
                    .from('institute_settings')
                    .select('razorpay_key_secret')
                    .eq('id', instituteId)
                    .maybeSingle();

                if (data?.razorpay_key_secret && !candidateSecrets.includes(data.razorpay_key_secret)) {
                    candidateSecrets.unshift(data.razorpay_key_secret);
                }
            } catch (err) {
                console.warn('[verify-payment] Error fetching institute secret:', err.message);
            }
        }

        const data = `${razorpay_order_id}|${razorpay_payment_id}`;
        let isMatch = false;

        for (const secret of candidateSecrets) {
            if (!secret) continue;
            const generatedSignature = crypto
                .createHmac('sha256', secret)
                .update(data)
                .digest('hex');

            if (generatedSignature === razorpay_signature) {
                isMatch = true;
                break;
            }
        }

        if (!isMatch) {
            console.error('[verify-payment] Signature mismatch for order:', razorpay_order_id);
            return res.status(400).json({
                success: false,
                verified: false,
                error: 'Payment verification failed: Signature mismatch'
            });
        }

        // Signature verified! Now complete order and enroll student in Supabase
        try {
            // Find order
            let orderQuery = supabase.from('orders').select('*');
            if (razorpay_order_id) {
                orderQuery = orderQuery.eq('razorpay_order_id', razorpay_order_id);
            } else if (dbOrderId) {
                orderQuery = orderQuery.eq('id', dbOrderId);
            }
            const { data: order } = await orderQuery.maybeSingle();

            if (order) {
                // Update order to completed
                await supabase
                    .from('orders')
                    .update({
                        status: 'completed',
                        razorpay_payment_id: razorpay_payment_id,
                        razorpay_signature: razorpay_signature,
                        payment_verified_at: new Date().toISOString()
                    })
                    .eq('id', order.id);

                // Auto-enroll student into linked courses
                const productId = order.product_id;
                const userEmail = order.user_email;

                if (productId && userEmail) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('id, institute_id')
                        .ilike('email', userEmail)
                        .maybeSingle();

                    if (member) {
                        const { data: courses } = await supabase
                            .from('courses')
                            .select('id, title, allowed_products');

                        const matchedCourses = (courses || []).filter(c =>
                            c.allowed_products &&
                            Array.isArray(c.allowed_products) &&
                            c.allowed_products.includes(Number(productId))
                        );

                        for (const c of matchedCourses) {
                            const { data: existing } = await supabase
                                .from('enrollments')
                                .select('id')
                                .eq('member_id', member.id)
                                .eq('course_id', c.id)
                                .maybeSingle();

                            if (!existing) {
                                await supabase
                                    .from('enrollments')
                                    .insert({
                                        member_id: member.id,
                                        course_id: c.id,
                                        institute_id: member.institute_id || instituteId || 10,
                                        status: 'active',
                                        progress: 0,
                                        enrolled_at: new Date().toISOString()
                                    });
                                console.log(`[verify-payment] Enrolled member ${member.id} in course ${c.id}`);
                            }
                        }
                    }
                }
            }
        } catch (dbErr) {
            console.error('[verify-payment] Database update error:', dbErr.message);
        }

        return res.status(200).json({
            success: true,
            verified: true,
            message: 'Payment signature verified successfully',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        });
    } catch (error) {
        console.error('[verify-payment] Verification error:', error);
        return res.status(500).json({
            success: false,
            verified: false,
            error: error.message || 'Internal server error during verification'
        });
    }
}
