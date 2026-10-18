// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order and stores it in the database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Create Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Attach to req for easier access if needed pattern, or just use variable
    req.supabaseClient = supabase

    try {
        const { productId, userId, userEmail, amount, couponCode, offerId, discountAmount } = await req.json()

        // Validate required fields
        if (!productId || !userId || !amount) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get Razorpay credentials from environment
        // Fetch Razorpay credentials from database
        const { data: instituteSettings, error: settingsError } = await req.supabaseClient
            .from('institute_settings')
            .select('razorpay_key_id, razorpay_key_secret')
            .single()

        const RAZORPAY_KEY_ID = instituteSettings?.razorpay_key_id || Deno.env.get('RAZORPAY_KEY_ID')
        const RAZORPAY_KEY_SECRET = instituteSettings?.razorpay_key_secret || Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            console.error('Razorpay credentials missing. Env or DB not configured.')
            throw new Error('Razorpay credentials not configured')
        }

        // Create Razorpay order
        const orderAmount = Math.round(amount * 100) // Convert to paise
        const razorpayOrderData = {
            amount: orderAmount,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
            notes: {
                product_id: productId,
                user_id: userId,
                user_email: userEmail
            }
        }

        // Make request to Razorpay API
        const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(razorpayOrderData),
        })

        if (!razorpayResponse.ok) {
            const errorData = await razorpayResponse.json()
            console.error('Razorpay API error:', errorData)
            throw new Error(`Razorpay API error: ${errorData.error?.description || 'Unknown error'}`)
        }

        const razorpayOrder = await razorpayResponse.json()

        // Supabase client already initialized above

        // Store order in database with pending status
        const { data: order, error: dbError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                user_email: userEmail,
                product_id: productId,
                amount: amount,
                original_price: amount + (discountAmount || 0),
                discount_amount: discountAmount || 0,
                coupon_code: couponCode || null,
                offer_id: offerId || null,
                status: 'pending',
                payment_method: 'razorpay',
                razorpay_order_id: razorpayOrder.id,
            })
            .select()
            .single()

        if (dbError) {
            console.error('Database error:', dbError)
            throw new Error(`Database error: ${dbError.message}`)
        }

        // Return order details to frontend
        return new Response(
            JSON.stringify({
                success: true,
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                dbOrderId: order.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in create-razorpay-order:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
