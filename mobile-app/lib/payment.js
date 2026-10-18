import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from './supabase';
import { Alert } from 'react-native';
import { getApiUrl, ORG_CONFIG } from '../config/organization';

/**
 * Initiates the payment flow for a product.
 * @param {object} product - Product details (id, title, price, etc.)
 * @param {object} user - User details (id, email, phone, name)
 * @param {string} [couponCode] - Optional coupon code
 * @returns {Promise<object>} - Result of the payment flow
 */
export const initiatePayment = async (product, user, couponCode = null) => {
    try {
        if (!user || !user.email) {
            throw new Error('User email is required for payment.');
        }

        // 1. Create Order on Backend
        const createOrderResponse = await fetch(getApiUrl('/api/razorpay/create-order'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: product.id,
                userId: user.id,
                userEmail: user.email,
                couponCode: couponCode
            }),
        });

        const orderData = await createOrderResponse.json();

        if (!orderData.success) {
            throw new Error(orderData.error || 'Failed to create order');
        }

        const { orderId, amount, currency, dbOrderId, keyId } = orderData;

        // 2. Open Razorpay Checkout
        const options = {
            description: `Purchase ${product.title}`,
            image: product.image_url || 'https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/institute-assets/logo_1765636679232.jpg', // Fallback to default if no product image
            currency: currency,
            key: keyId,
            amount: amount,
            name: ORG_CONFIG.name,
            order_id: orderId, // Razorpay Order ID
            prefill: {
                email: user.email,
                contact: user.phone || '', // Check if phone is available in user object
                name: user.user_metadata?.full_name || user.email.split('@')[0]
            },
            theme: { color: ORG_CONFIG.colors.primary }
        };

        const paymentData = await RazorpayCheckout.open(options);

        // 3. Verify Payment on Backend
        const verifyResponse = await fetch(getApiUrl('/api/razorpay/verify'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: paymentData.razorpay_order_id,
                paymentId: paymentData.razorpay_payment_id,
                signature: paymentData.razorpay_signature,
                dbOrderId: dbOrderId
            }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyData.success) {
            throw new Error(verifyData.error || 'Payment verification failed');
        }

        return { success: true, dbOrderId };

    } catch (error) {
        console.error('Payment Error:', error);
        // Razorpay specific error handling if needed
        if (error.code && error.description) {
            Alert.alert('Payment Failed', error.description);
        } else {
            Alert.alert('Error', error.message);
        }
        return { success: false, error: error.message };
    }
};
