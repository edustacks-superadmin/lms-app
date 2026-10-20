import crypto from 'crypto';

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                verified: false,
                error: 'Missing required payment verification fields (order_id, payment_id, signature)'
            });
        }

        if (!KEY_SECRET) {
            return res.status(500).json({
                success: false,
                error: 'Razorpay secret key not configured on server'
            });
        }

        // HMAC-SHA256 signature verification
        const data = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generatedSignature = crypto
            .createHmac('sha256', KEY_SECRET)
            .update(data)
            .digest('hex');

        const isMatch = generatedSignature === razorpay_signature;

        if (!isMatch) {
            console.error('[verify-payment] Signature mismatch:', {
                generated: generatedSignature,
                received: razorpay_signature
            });
            return res.status(400).json({
                success: false,
                verified: false,
                error: 'Payment verification failed: Signature mismatch'
            });
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
