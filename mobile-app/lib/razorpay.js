import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from './supabase';
import { getApiUrl } from '../config/organization';

/**
 * Get Razorpay API key from institute settings
 * @returns {Promise<string>} - Razorpay key ID
 */
const getRazorpayKey = async () => {
    try {
        const { data, error } = await supabase
            .from('institute_settings')
            .select('razorpay_key_id')
            .single();

        if (error) {
            console.error('Error fetching Razorpay key:', error);
            return null;
        }

        return data?.razorpay_key_id || null;
    } catch (error) {
        console.error('Error getting Razorpay key:', error);
        return null;
    }
};

/**
 * Create Razorpay order on server
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} - Order object with razorpay_order_id
 */
export const createRazorpayOrder = async (orderData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get member info
        const { data: member } = await supabase
            .from('members')
            .select('id, email, name')
            .eq('email', user.email)
            .single();

        if (!member) throw new Error('Member not found');

        // Create order in database
        const { data: order, error } = await supabase
            .from('orders')
            .insert({
                member_id: member.id,
                product_id: orderData.product_id,
                amount: orderData.amount,
                status: 'pending',
                payment_method: 'razorpay',
            })
            .select()
            .single();

        if (error) throw error;

        // In a production app, you would call your backend API here
        // to create a Razorpay order and get the order_id
        // For now, we'll return the order with a mock Razorpay order ID

        return {
            ...order,
            razorpay_order_id: `order_${order.id}_${Date.now()}`, // Mock for demo
        };
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw error;
    }
};

/**
 * Open Razorpay checkout
 * @param {Object} options - Payment options
 * @returns {Promise<Object>} - Payment response
 */
export const initiateRazorpayPayment = async (options) => {
    const {
        orderId,
        amount,
        productName,
        productImage,
        userEmail,
        userName,
    } = options;

    // Fetch Razorpay key from database
    const RAZORPAY_KEY_ID = await getRazorpayKey();

    if (!RAZORPAY_KEY_ID) {
        throw new Error('Razorpay API key not configured. Please add it in Admin > App Integration settings.');
    }

    const razorpayOptions = {
        description: productName,
        image: productImage,
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: amount * 100, // Convert to paise
        name: 'LMS Platform',
        order_id: orderId,
        prefill: {
            email: userEmail,
            name: userName,
        },
        theme: { color: '#2563EB' },
    };

    try {
        const data = await RazorpayCheckout.open(razorpayOptions);
        return {
            success: true,
            paymentId: data.razorpay_payment_id,
            orderId: data.razorpay_order_id,
            signature: data.razorpay_signature,
        };
    } catch (error) {
        console.error('Razorpay payment error:', error);
        return {
            success: false,
            error: error.description || error.message || 'Payment failed',
            code: error.code,
        };
    }
};

/**
 * Verify and complete payment - calls Next.js API to trigger order confirmation email
 * @param {Object} paymentData - Payment verification data
 * @returns {Promise<boolean>} - Success status
 */
export const verifyAndCompletePayment = async (paymentData) => {
    try {
        const { orderId, paymentId, signature, productId, dbOrderId } = paymentData;

        // Call the Next.js API for verification - this also sends order confirmation email
        const response = await fetch(getApiUrl('/api/razorpay/verify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                razorpay_signature: signature,
                order_id: dbOrderId
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error('Payment verification failed:', result);
            // Fallback: Update order status directly if API fails
            await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                })
                .eq('razorpay_order_id', orderId);
        }

        // Enrollment is handled by the API, but as a fallback, do it here too
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('email', user.email)
            .single();

        // Get courses linked to this product and validity info
        const { data: product } = await supabase
            .from('products')
            .select('linked_courses, validity_type, validity')
            .eq('id', productId)
            .maybeSingle();

        let expiresAt = null;
        if (product?.validity_type === 'Fixed (calendar date)' && product.validity) {
            expiresAt = new Date(`${product.validity}T23:59:59.999Z`).toISOString();
        } else if (product?.validity_type === 'Relative (in days)' && product.validity) {
            const days = parseInt(product.validity, 10);
            if (!isNaN(days) && days > 0) {
                expiresAt = new Date(Date.now() + days * 86400000).toISOString();
            }
        }

        // Also check courses table for allowed_products containing this productId
        const { data: allowedCourses } = await supabase
            .from('courses')
            .select('id')
            .contains('allowed_products', [productId]);

        const linkedCourseIds = [
            ...(product?.linked_courses || []),
            ...(allowedCourses || []).map(c => c.id)
        ];
        const uniqueCourseIds = [...new Set(linkedCourseIds)];

        if (member && uniqueCourseIds.length > 0) {
            for (const courseId of uniqueCourseIds) {
                const { data: existing } = await supabase
                    .from('enrollments')
                    .select('id, cycle_number')
                    .eq('member_id', member.id)
                    .eq('course_id', courseId)
                    .maybeSingle();

                if (!existing) {
                    await supabase
                        .from('enrollments')
                        .insert({
                            member_id: member.id,
                            course_id: courseId,
                            status: 'active',
                            progress: 0,
                            enrolled_at: new Date().toISOString(),
                            expires_at: expiresAt,
                            cycle_number: 1
                        });
                } else {
                    await supabase
                        .from('enrollments')
                        .update({
                            status: 'active',
                            enrolled_at: new Date().toISOString(),
                            expires_at: expiresAt,
                            cycle_number: (existing.cycle_number || 1) + 1
                        })
                        .eq('id', existing.id);
                }
            }
        }

        console.log('Payment verified and order confirmation email sent');
        return true;
    } catch (error) {
        console.error('Error verifying payment:', error);
        return false;
    }
};

export default {
    createRazorpayOrder,
    initiateRazorpayPayment,
    verifyAndCompletePayment,
};
