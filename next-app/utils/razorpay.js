/**
 * Initialize Razorpay Checkout
 * @param {Object} options - Razorpay checkout options
 * @returns {Promise} - Resolves when payment is complete
 */
export const initializeRazorpayCheckout = (options) => {
    return new Promise((resolve, reject) => {
        // Load Razorpay script if not already loaded
        if (!window.Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => initCheckout(options, resolve, reject);
            script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
            document.body.appendChild(script);
        } else {
            initCheckout(options, resolve, reject);
        }
    });
};

const initCheckout = (options, resolve, reject) => {
    const {
        orderId,
        amount,
        currency = 'INR',
        name,
        description,
        keyId,
        image,
        prefill = {},
        onSuccess,
        onFailure,
        onDismiss
    } = options;

    const razorpayOptions = {
        key: keyId,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: currency,
        name: name,
        description: description,
        image: image,
        order_id: orderId,
        prefill: {
            name: prefill.name || '',
            email: prefill.email || '',
            contact: prefill.contact || ''
        },
        theme: {
            color: '#2563eb'
        },
        handler: function (response) {
            // Payment successful
            if (onSuccess) {
                onSuccess({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature
                });
            }
            resolve(response);
        },
        modal: {
            ondismiss: function () {
                // User closed the checkout
                if (onDismiss) {
                    onDismiss();
                }
                reject(new Error('Payment cancelled by user'));
            }
        }
    };

    try {
        const rzp = new window.Razorpay(razorpayOptions);

        rzp.on('payment.failed', function (response) {
            // Payment failed
            if (onFailure) {
                onFailure({
                    error: response.error.code,
                    description: response.error.description,
                    source: response.error.source,
                    step: response.error.step,
                    reason: response.error.reason,
                    orderId: response.error.metadata.order_id,
                    paymentId: response.error.metadata.payment_id
                });
            }
            reject(new Error(response.error.description || 'Payment failed'));
        });

        rzp.open();
    } catch (error) {
        console.error('Error initializing Razorpay:', error);
        reject(error);
    }
};
