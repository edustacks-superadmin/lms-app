/**
 * Razorpay Utility Functions
 * Handles loading Razorpay checkout script and payment processing
 */

/**
 * Load Razorpay checkout script dynamically
 * @returns {Promise<boolean>} True if script loaded successfully
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        // Check if already loaded
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Initialize Razorpay checkout
 * @param {Object} options - Razorpay checkout options
 * @param {string} options.orderId - Razorpay order ID
 * @param {number} options.amount - Amount in smallest currency unit (paise)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.name - Business/product name
 * @param {string} options.description - Order description
 * @param {string} options.keyId - Razorpay key ID
 * @param {Object} options.prefill - User prefill data
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onFailure - Failure callback
 * @param {Function} options.onDismiss - Modal dismiss callback
 */
export const initializeRazorpayCheckout = async (options) => {
    const {
        orderId,
        amount,
        currency = 'INR',
        name,
        description,
        keyId,
        prefill = {},
        onSuccess,
        onFailure,
        onDismiss,
        image
    } = options;

    // Load script first
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
        console.error('Failed to load Razorpay script');
        if (onFailure) onFailure(new Error('Failed to load Razorpay'));
        return;
    }

    // Configure Razorpay options
    const razorpayOptions = {
        key: keyId,
        order_id: orderId,
        amount: amount, // Amount in paise
        currency: currency,
        name: name || 'LMS Payment',
        description: description || 'Course Purchase',
        image: image || undefined,
        prefill: {
            name: prefill.name || '',
            email: prefill.email || '',
            contact: prefill.contact || ''
        },
        theme: {
            color: '#3399cc' // Can be customized
        },
        config: {
            display: {
                blocks: {
                    upi: {
                        name: 'Pay using UPI',
                        instruments: [
                            {
                                method: 'upi'
                            }
                        ]
                    },
                    other: {
                        name: 'Other Payment Methods',
                        instruments: [
                            {
                                method: 'card'
                            },
                            {
                                method: 'netbanking'
                            },
                            {
                                method: 'wallet'
                            }
                        ]
                    }
                },
                sequence: ['block.upi', 'block.other'],
                preferences: {
                    show_default_blocks: false
                }
            }
        },
        handler: function (response) {
            // Success handler
            if (onSuccess) {
                onSuccess({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                });
            }
        },
        modal: {
            ondismiss: function () {
                // User closed the modal without completing payment
                if (onDismiss) onDismiss();
            },
            escape: true,
            backdropclose: false
        }
    };

    // Initialize and open Razorpay checkout
    try {
        const razorpay = new window.Razorpay(razorpayOptions);

        razorpay.on('payment.failed', function (response) {
            // Payment failed handler
            if (onFailure) {
                onFailure({
                    error: response.error,
                    metadata: response.metadata
                });
            }
        });

        razorpay.open();
    } catch (error) {
        console.error('Error initializing Razorpay:', error);
        if (onFailure) onFailure(error);
    }
};

/**
 * Format amount to paise (smallest currency unit)
 * @param {number} amount - Amount in rupees
 * @returns {number} Amount in paise
 */
export const formatAmountToPaise = (amount) => {
    return Math.round(amount * 100);
};

/**
 * Format amount from paise to rupees
 * @param {number} paise - Amount in paise
 * @returns {number} Amount in rupees
 */
export const formatAmountToRupees = (paise) => {
    return paise / 100;
};
