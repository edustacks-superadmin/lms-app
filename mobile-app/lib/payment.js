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

        const payableAmount = product.finalPrice !== undefined ? product.finalPrice : (product.price || 0);
        const amountInPaise = Math.round(Number(payableAmount) * 100);

        if (amountInPaise < 100) {
            throw new Error('Amount must be at least ₹1 (100 paise)');
        }

        // 1. Create Order on Backend
        const createOrderResponse = await fetch(getApiUrl('/api/razorpay/create-order'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                productId: product.id,
                instituteId: product.institute_id || 10,
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
            image: product.image_url || 'https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/institute-assets/logo_1765636679232.jpg',
            currency: currency || 'INR',
            key: keyId,
            amount: amount,
            name: ORG_CONFIG.name,
            order_id: orderId, // Razorpay Order ID
            prefill: {
                email: user.email,
                contact: user.phone || '',
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
                instituteId: product.institute_id || 10,
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
        if (error.code && error.description) {
            Alert.alert('Payment Failed', error.description);
        } else {
            Alert.alert('Error', error.message);
        }
        return { success: false, error: error.message };
    }
};

/**
 * Initiates the payment flow for all items in the cart in a single transaction.
 * @param {object} cart - Cart object containing items, count, and total
 * @param {object} user - User details (id, email, phone, name)
 * @param {string} [couponCode] - Optional coupon code
 * @returns {Promise<object>} - Result of the payment flow
 */
export const initiateCartPayment = async (cart, user, couponCode = null) => {
    try {
        if (!user || !user.email) {
            throw new Error('User email is required for payment.');
        }

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new Error('Cart is empty.');
        }

        const payableAmount = Number(cart.total) || 0;
        const amountInPaise = Math.round(payableAmount * 100);

        if (amountInPaise < 100) {
            throw new Error('Amount must be at least ₹1 (100 paise)');
        }

        const productIds = cart.items.map(item => item.product_id || item.id).filter(Boolean);
        const instituteId = ORG_CONFIG.id || 10;

        // 1. Create Order on Backend for whole cart
        const createOrderResponse = await fetch(getApiUrl('/api/razorpay/create-order'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                productId: productIds[0],
                productIds: productIds,
                isCart: true,
                items: cart.items.map(item => ({
                    id: item.product_id || item.id,
                    title: item.title,
                    price: item.price
                })),
                instituteId: instituteId,
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

        // 2. Open Razorpay Checkout for full cart
        const firstItem = cart.items[0];
        const description = cart.items.length === 1
            ? `Purchase ${firstItem.title}`
            : `Purchase ${cart.items.length} Courses`;

        const options = {
            description: description,
            image: firstItem?.image || 'https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/institute-assets/logo_1765636679232.jpg',
            currency: currency || 'INR',
            key: keyId,
            amount: amount,
            name: ORG_CONFIG.name,
            order_id: orderId, // Razorpay Order ID
            prefill: {
                email: user.email,
                contact: user.phone || '',
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
                instituteId: instituteId,
                dbOrderId: dbOrderId
            }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyData.success) {
            throw new Error(verifyData.error || 'Payment verification failed');
        }

        return { success: true, dbOrderId, count: cart.items.length };

    } catch (error) {
        console.error('Cart Payment Error:', error);
        if (error.code && error.description) {
            Alert.alert('Payment Failed', error.description);
        } else {
            Alert.alert('Error', error.message);
        }
        return { success: false, error: error.message };
    }
};
