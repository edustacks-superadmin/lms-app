// Supabase Edge Function: verify-razorpay-payment
// Verifies Razorpay payment signature and updates order status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new Response(
                JSON.stringify({ error: 'Missing required payment details' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get Razorpay credentials from database
        const { data: settings } = await supabase
            .from('institute_settings')
            .select('razorpay_key_secret')
            .single()

        const RAZORPAY_KEY_SECRET = settings?.razorpay_key_secret || Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay credentials not configured')
        }

        // Verify signature
        const text = `${razorpay_order_id}|${razorpay_payment_id}`
        const encoder = new TextEncoder()
        const keyData = encoder.encode(RAZORPAY_KEY_SECRET)
        const messageData = encoder.encode(text)

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
        const expectedSignature = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        const isValid = expectedSignature === razorpay_signature

        if (!isValid) {
            return new Response(
                JSON.stringify({ error: 'Invalid payment signature', verified: false }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Supabase client already initialized above

        // Find order by razorpay_order_id
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // Update order status to completed
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                payment_verified_at: new Date().toISOString()
            })
            .eq('id', order.id)

        if (updateError) {
            throw new Error(`Failed to update order: ${updateError.message}`)
        }

        // Auto-enroll student in course
        try {
            // Get product details to find course
            const { data: product } = await supabase
                .from('products')
                .select('title, course_id')
                .eq('id', order.product_id)
                .single()

            let courseId = product?.course_id

            // If no direct course_id, try to find via allowed_products
            if (!courseId) {
                const { data: courses } = await supabase
                    .from('courses')
                    .select('id, allowed_products')

                if (courses) {
                    const matchedCourse = courses.find(c =>
                        c.allowed_products &&
                        Array.isArray(c.allowed_products) &&
                        c.allowed_products.includes(order.product_id)
                    )
                    if (matchedCourse) courseId = matchedCourse.id
                }
            }

            // Get member_id from user_email
            if (courseId) {
                const { data: member } = await supabase
                    .from('members')
                    .select('id')
                    .ilike('email', order.user_email)
                    .single()

                if (member) {
                    // Check if already enrolled
                    const { data: existing } = await supabase
                        .from('enrollments')
                        .select('id')
                        .eq('student_id', member.id)
                        .eq('course_id', courseId)
                        .single()

                    if (!existing) {
                        // Create enrollment
                        await supabase
                            .from('enrollments')
                            .insert({
                                student_id: member.id,
                                course_id: courseId,
                                status: 'active',
                                progress: 0,
                                enrolled_at: new Date().toISOString()
                            })
                    }
                }
            }
        } catch (enrollError) {
            console.error('Enrollment error (non-fatal):', enrollError)
            // Don't fail the payment verification if enrollment fails
        }

        return new Response(
            JSON.stringify({
                success: true,
                verified: true,
                message: 'Payment verified successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in verify-razorpay-payment:', error)
        return new Response(
            JSON.stringify({ error: error.message, verified: false }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
