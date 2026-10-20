import Razorpay from 'razorpay';

const KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
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
        let { amount, currency = 'INR', receipt, notes } = body;

        // If amount is not provided or invalid
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Amount must be in paise and at least 100 paise (₹1)
        const amountInPaise = Math.round(Number(amount));
        if (amountInPaise < 100) {
            return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
        }

        if (!KEY_ID || !KEY_SECRET) {
            return res.status(500).json({ error: 'Razorpay credentials not configured' });
        }

        const razorpay = new Razorpay({
            key_id: KEY_ID,
            key_secret: KEY_SECRET
        });

        const options = {
            amount: amountInPaise,
            currency: currency.toUpperCase(),
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {}
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            order_id: order.id,
            orderId: order.id,
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: KEY_ID,
            keyId: KEY_ID
        });
    } catch (error) {
        console.error('[create-order] Razorpay Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create Razorpay order'
        });
    }
}
