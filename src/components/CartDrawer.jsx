import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Trash2, ArrowRight, ShieldCheck, CreditCard, Smartphone, CheckCircle, Copy } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { useTransactions } from '../context/TransactionContext';
import { initializeRazorpayCheckout } from '../utils/razorpay';

const CartDrawer = () => {
    const { cartItems, removeFromCart, clearCart, isCartOpen, closeCart, cartCount, cartTotal } = useCart();
    const { user } = useAuth();
    const { institute } = useInstitute();
    const { createOrder, createRazorpayOrder, verifyRazorpayPayment } = useTransactions();
    const navigate = useNavigate();

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'upi'
    const [utr, setUtr] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const isManualPaymentEnabled = institute?.feature_flags?.manualPaymentEnabled !== false;

    // Reset to razorpay if manual payments are disabled
    useEffect(() => {
        if (!isManualPaymentEnabled && paymentMethod === 'upi') {
            setPaymentMethod('razorpay');
        }
    }, [isManualPaymentEnabled, paymentMethod]);

    if (!isCartOpen) return null;

    const totalSavings = cartItems.reduce((acc, item) => {
        if (item.strikethrough_price && item.strikethrough_price > item.price) {
            return acc + (item.strikethrough_price - item.price);
        }
        return acc;
    }, 0);

    const UPI_ID = institute?.upi_id || "example@upi";

    const handleSingleCheckout = (product) => {
        closeCart();
        navigate(`/student/store/product/${product.id}`);
    };

    const handleUpiCartPayment = async () => {
        if (!utr.trim()) {
            alert('Please enter your 12-digit UPI Reference / UTR Number.');
            return;
        }

        setProcessingPayment(true);
        try {
            // Create an order for each item in cart
            for (const item of cartItems) {
                const orderData = {
                    user_id: user.id,
                    user_email: user.email,
                    product_id: item.id,
                    amount: item.price,
                    status: 'pending',
                    utr: utr.trim(),
                    original_price: item.strikethrough_price || item.price,
                    discount_amount: item.strikethrough_price && item.strikethrough_price > item.price ? (item.strikethrough_price - item.price) : 0,
                    payment_method: 'upi'
                };
                await createOrder(orderData);
            }

            clearCart();
            setIsCheckingOut(false);
            closeCart();
            alert('Payment submitted for approval! Your orders will be activated soon.');
            navigate('/student/dashboard');
        } catch (error) {
            console.error('Cart UPI checkout error:', error);
            alert('Error submitting payment: ' + error.message);
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleRazorpayCartPayment = async () => {
        setProcessingPayment(true);
        try {
            // For multi-item or single item Razorpay checkout:
            // Process the first item directly or create order
            const item = cartItems[0];
            const orderResult = await createRazorpayOrder({
                productId: item.id,
                userId: user.id,
                userEmail: user.email,
                amount: cartTotal
            });

            if (!orderResult.success) {
                throw new Error(orderResult.error || 'Failed to initialize payment');
            }

            await initializeRazorpayCheckout({
                orderId: orderResult.orderId,
                amount: orderResult.amount,
                currency: orderResult.currency || 'INR',
                name: institute?.name || 'LMS Academy',
                description: cartItems.map(i => i.title).join(', ').slice(0, 200),
                keyId: institute?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
                image: institute?.logo || undefined,
                prefill: {
                    name: user.name || user.email,
                    email: user.email,
                    contact: user.phone_number || ''
                },
                onSuccess: async (paymentData) => {
                    const verifyResult = await verifyRazorpayPayment(paymentData);
                    if (verifyResult.success) {
                        clearCart();
                        closeCart();
                        alert('Payment successful! Courses have been unlocked.');
                        navigate('/student/courses');
                    } else {
                        alert('Payment verification failed: ' + verifyResult.error);
                    }
                    setProcessingPayment(false);
                },
                onFailure: (err) => {
                    console.error('Payment failed:', err);
                    alert('Payment failed. Please try again.');
                    setProcessingPayment(false);
                },
                onDismiss: () => {
                    setProcessingPayment(false);
                }
            });
        } catch (err) {
            console.error('Razorpay cart error:', err);
            alert('Checkout error: ' + err.message);
            setProcessingPayment(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.2s ease'
        }}>
            {/* Backdrop click to close */}
            <div
                style={{ position: 'absolute', inset: 0 }}
                onClick={closeCart}
            />

            {/* Slide-over Drawer Panel */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                height: '100%',
                backgroundColor: '#ffffff',
                boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10000,
                animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Drawer Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                                My Cart
                            </h3>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {cartCount} {cartCount === 1 ? 'item' : 'items'} selected
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={closeCart}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Drawer Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {cartCount === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#64748b',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px',
                                color: '#94a3b8'
                            }}>
                                <ShoppingCart size={36} />
                            </div>
                            <h4 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                                Your cart is empty
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '240px', marginBottom: '20px' }}>
                                Explore our courses and test series to add them to your cart.
                            </p>
                            <button
                                onClick={() => {
                                    closeCart();
                                    navigate('/student/store');
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Browse Store
                            </button>
                        </div>
                    ) : isCheckingOut ? (
                        /* Checkout Step inside Drawer */
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                                <button
                                    onClick={() => setIsCheckingOut(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    ← Back to Cart
                                </button>
                            </div>

                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                                Choose Payment Method
                            </h4>

                            {/* Method Selector */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: `1.5px solid ${paymentMethod === 'razorpay' ? '#2563eb' : '#e2e8f0'}`,
                                    backgroundColor: paymentMethod === 'razorpay' ? '#f0f7ff' : 'white',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        checked={paymentMethod === 'razorpay'}
                                        onChange={() => setPaymentMethod('razorpay')}
                                    />
                                    <CreditCard size={18} color="#2563eb" />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                            Online Payment (Cards / UPI / NetBanking)
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Instant course activation via Razorpay</div>
                                    </div>
                                </label>

                                {isManualPaymentEnabled && (
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${paymentMethod === 'upi' ? '#2563eb' : '#e2e8f0'}`,
                                        backgroundColor: paymentMethod === 'upi' ? '#f0f7ff' : 'white',
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === 'upi'}
                                            onChange={() => setPaymentMethod('upi')}
                                        />
                                        <Smartphone size={18} color="#059669" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                                Manual UPI Transfer
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Pay to UPI ID and submit UTR</div>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {paymentMethod === 'upi' && (
                                <div style={{
                                    padding: '14px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Pay Total of ₹{cartTotal} to UPI ID:</div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: 'white',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{UPI_ID}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(UPI_ID);
                                                alert('UPI ID copied to clipboard!');
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <Copy size={14} /> Copy
                                        </button>
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>Enter 12-Digit UTR / Ref No:</div>
                                    <input
                                        type="text"
                                        placeholder="e.g. 402819283749"
                                        value={utr}
                                        onChange={(e) => setUtr(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            )}

                            <button
                                onClick={paymentMethod === 'razorpay' ? handleRazorpayCartPayment : handleUpiCartPayment}
                                disabled={processingPayment}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    cursor: processingPayment ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    opacity: processingPayment ? 0.7 : 1
                                }}
                            >
                                {processingPayment ? 'Processing...' : `Pay ₹${cartTotal} & Enroll`}
                            </button>
                        </div>
                    ) : (
                        /* Items List */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {cartItems.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid #f1f5f9',
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    {/* Thumbnail */}
                                    <div style={{
                                        width: '70px',
                                        height: '56px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f1f5f9',
                                        flexShrink: 0
                                    }}>
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                <ShoppingCart size={20} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <h4
                                                onClick={() => handleSingleCheckout(item)}
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#0f172a',
                                                    margin: 0,
                                                    lineHeight: '1.3',
                                                    cursor: 'pointer',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                                title={item.title}
                                            >
                                                {item.title}
                                            </h4>

                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title="Remove from cart"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                                                ₹{item.price}
                                            </span>
                                            {item.strikethrough_price && item.strikethrough_price > item.price && (
                                                <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                    ₹{item.strikethrough_price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                    onClick={clearCart}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Trash2 size={13} /> Clear Cart
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Drawer Footer / Summary */}
                {cartCount > 0 && !isCheckingOut && (
                    <div style={{
                        padding: '20px 24px',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: '#fafbfc'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                            <span>Subtotal</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>₹{cartTotal}</span>
                        </div>

                        {totalSavings > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#16a34a' }}>
                                <span>Total Savings</span>
                                <span style={{ fontWeight: '600' }}>-₹{totalSavings}</span>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '18px',
                            fontSize: '17px',
                            fontWeight: '800',
                            color: '#0f172a',
                            paddingTop: '8px',
                            borderTop: '1px dashed #e2e8f0'
                        }}>
                            <span>Total Amount</span>
                            <span style={{ color: '#2563eb' }}>₹{cartTotal}</span>
                        </div>

                        <button
                            onClick={() => {
                                if (!user) {
                                    closeCart();
                                    navigate('/login?redirect=/student/store');
                                    return;
                                }
                                setIsCheckingOut(true);
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                        >
                            Proceed to Checkout <ArrowRight size={16} />
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '12px',
                            fontSize: '11px',
                            color: '#94a3b8'
                        }}>
                            <ShieldCheck size={14} color="#10b981" /> 100% Safe & Secure Checkout
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartDrawer;
