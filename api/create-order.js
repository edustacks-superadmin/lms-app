import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        let { amount, currency = 'INR', receipt, notes, isTest, instituteId } = body;

        // If amount is not provided or invalid
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Amount must be in paise and at least 100 paise (₹1)
        const amountInPaise = Math.round(Number(amount));
        if (amountInPaise < 100) {
            return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
        }

        let keyId = DEFAULT_KEY_ID;
        let keySecret = DEFAULT_KEY_SECRET;

        // If not explicit test and instituteId provided, check if institute has specific credentials
        if (!isTest && instituteId) {
            try {
                const { data } = await supabase
                    .from('institute_settings')
                    .select('razorpay_key_id, razorpay_key_secret')
                    .eq('id', instituteId)
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
