import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useInstitute } from '../context/InstituteContext';
import { ArrowLeft, ShoppingCart, Clock, Copy, CreditCard, Smartphone } from 'lucide-react';
import { initializeRazorpayCheckout } from '../utils/razorpay';

const StudentProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getProductById } = useProducts();
    const { createOrder, createRazorpayOrder, verifyRazorpayPayment, validateCoupon } = useTransactions();
    const { user } = useAuth();
    const { institute } = useInstitute();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'upi'
    const [utr, setUtr] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discountDetails, setDiscountDetails] = useState(null);
    const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const UPI_ID = institute?.upi_id || "example@upi";

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        const result = await getProductById(id);
        if (result.success) {
            setProduct(result.data);
        }
        setLoading(false);
    };

    const handleBuyClick = () => {
        if (!user) {
            alert('Please login to purchase');
            return;
        }
        setShowPayment(true);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponMessage({ type: '', text: '' });

        const result = await validateCoupon(couponCode, product.id, product.price);

        if (result.valid) {
            setDiscountDetails({
                amount: result.discountAmount,
                finalPrice: result.finalPrice,
                offerId: result.offerId
            });
            setCouponMessage({ type: 'success', text: result.message });
        } else {
            setDiscountDetails(null);
            setCouponMessage({ type: 'error', text: result.message });
        }
        setValidatingCoupon(false);
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        if (!utr.trim()) {
            alert('Please enter the Transaction ID / UTR');
            return;
        }

        setBuying(true);
        try {
            const orderData = {
                user_id: user.id,
                user_email: user.email,
                product_id: product.id,
                amount: discountDetails ? discountDetails.finalPrice : product.price,
                status: 'pending',
                utr: utr.trim(),
                original_price: product.price,
                discount_amount: discountDetails ? discountDetails.amount : 0,
                coupon_code: discountDetails ? couponCode : null,
                offer_id: discountDetails ? discountDetails.offerId : null,
                payment_method: 'upi'
            };

            const result = await createOrder(orderData);

            if (result.success) {
                alert('Payment details submitted! Please wait for admin approval.');
                navigate('/student/dashboard');
            } else {
                alert('Failed to submit payment: ' + result.error);
            }

        } catch (error) {
            console.error('Purchase error:', error);
            alert('There was an error processing your request. Please try again.');
        } finally {
            setBuying(false);
        }
    };

    const handleRazorpayPayment = async () => {
        setBuying(true);
        try {
            const finalAmount = discountDetails ? discountDetails.finalPrice : product.price;

            // Create Razorpay order via Edge Function
            const orderResult = await createRazorpayOrder({
                productId: product.id,
                userId: user.id,
                userEmail: user.email,
                amount: finalAmount,
                couponCode: discountDetails ? couponCode : null,
                offerId: discountDetails ? discountDetails.offerId : null,
                discountAmount: discountDetails ? discountDetails.amount : 0
            });

            if (!orderResult.success) {
                throw new Error(orderResult.error || 'Failed to create order');
            }

            // Initialize Razorpay checkout
            await initializeRazorpayCheckout({
                orderId: orderResult.orderId,
                amount: orderResult.amount,
                currency: orderResult.currency,
                name: institute?.name || 'LMS',
                description: product.title,
                keyId: institute?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
                image: institute?.logo || undefined,
                prefill: {
                    name: user.name || user.email,
                    email: user.email,
                    contact: user.phone_number || ''
                },
                onSuccess: async (paymentData) => {
                    // Verify payment via Edge Function
                    const verifyResult = await verifyRazorpayPayment(paymentData);

                    if (verifyResult.success) {
                        alert('Payment successful! You are now enrolled in the course.');
                        navigate('/student/my-courses');
                    } else {
                        alert('Payment verification failed: ' + verifyResult.error);
                    }
                    setBuying(false);
                },
                onFailure: (error) => {
                    console.error('Payment failed:', error);
                    alert('Payment failed. Please try again.');
                    setBuying(false);
                },
                onDismiss: () => {
                    console.log('Payment cancelled by user');
                    setBuying(false);
                }
            });

        } catch (error) {
            console.error('Error initiating payment:', error);
            alert('Error: ' + error.message);
            setBuying(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('UPI ID copied to clipboard!');
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading product...</div>;
    if (!product) return <div style={{ padding: '40px', textAlign: 'center' }}>Product not found</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/student/store')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '24px',
                    color: '#666'
                }}
            >
                <ArrowLeft size={20} /> Back to Store
            </button>

            <div className="product-detail-grid">
                {/* Main Content */}
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a1a' }}>
                        {product.title}
                    </h1>

                    {product.image && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #e5e7eb', aspectRatio: '16/9' }}>
                            <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>About this course</h3>
                        <div
                            dangerouslySetInnerHTML={{ __html: product.description || product.short_description }}
                            style={{ lineHeight: '1.6', color: '#4b5563' }}
                        />
                    </div>
                </div>

                {/* Sidebar / Checkout Card */}
                <div>
                    <div style={{
                        position: 'sticky',
                        top: '20px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ marginBottom: '24px' }}>
                            {product.strikethrough_price && !discountDetails && (
                                <div style={{ textDecoration: 'line-through', color: '#9ca3af', marginBottom: '4px' }}>
                                    ₹{product.strikethrough_price}
                                </div>
                            )}
                            {discountDetails && (
                                <div style={{ textDecoration: 'line-through', color: '#9ca3af', marginBottom: '4px' }}>
                                    ₹{product.price}
                                </div>
                            )}
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a' }}>
                                {discountDetails
                                    ? `₹${discountDetails.finalPrice}`
                                    : (product.price > 0 ? `₹${product.price}` : 'Free')
                                }
                            </div>
                        </div>

                        {/* Coupon Section */}
                        {!showPayment && (
                            <div style={{ marginBottom: '16px' }}>
                                {!discountDetails ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Coupon Code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            style={{
                                                padding: '10px 16px',
                                                backgroundColor: '#f3f4f6',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {validatingCoupon ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ padding: '10px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#047857', fontSize: '14px', fontWeight: '500' }}>
                                            Coupon Applied! (-₹{discountDetails.amount})
                                        </span>
                                        <button
                                            onClick={() => { setDiscountDetails(null); setCouponCode(''); setCouponMessage({ type: '', text: '' }); }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                )}
                                {couponMessage.text && (
                                    <p style={{ fontSize: '12px', marginTop: '4px', color: couponMessage.type === 'success' ? '#059669' : '#dc2626' }}>
                                        {couponMessage.text}
                                    </p>
                                )}
                            </div>
                        )}

                        {!showPayment ? (
                            <button
                                onClick={handleBuyClick}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginBottom: '16px'
                                }}
                            >
                                <ShoppingCart size={20} /> Buy Now
                            </button>
                        ) : (
                            <div style={{ marginBottom: '20px' }}>
                                {/* Payment Method Selection */}
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>Select Payment Method</h4>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => setPaymentMethod('razorpay')}
                                            style={{
                                                flex: 1,
                                                padding: '16px',
                                                backgroundColor: paymentMethod === 'razorpay' ? '#ecfdf5' : 'white',
                                                border: paymentMethod === 'razorpay' ? '2px solid var(--primary-color)' : '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <CreditCard size={24} color={paymentMethod === 'razorpay' ? 'var(--primary-color)' : '#6b7280'} />
                                            <span style={{ fontSize: '14px', fontWeight: '500' }}>Online Payment</span>
                                            <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>GPay, PhonePe, Paytm, Cards</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('upi')}
                                            style={{
                                                flex: 1,
                                                padding: '16px',
                                                backgroundColor: paymentMethod === 'upi' ? '#ecfdf5' : 'white',
                                                border: paymentMethod === 'upi' ? '2px solid var(--primary-color)' : '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Smartphone size={24} color={paymentMethod === 'upi' ? 'var(--primary-color)' : '#6b7280'} />
                                            <span style={{ fontSize: '14px', fontWeight: '500' }}>UPI/Manual</span>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Admin Approval</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Razorpay Payment */}
                                {paymentMethod === 'razorpay' && (
                                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                        <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px', textAlign: 'center' }}>
                                            Complete payment securely with Razorpay. You'll be enrolled instantly after successful payment.
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => setShowPayment(false)}
                                                style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleRazorpayPayment}
                                                disabled={buying}
                                                style={{
                                                    flex: 2,
                                                    padding: '10px',
                                                    backgroundColor: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '500',
                                                    cursor: buying ? 'not-allowed' : 'pointer',
                                                    opacity: buying ? 0.7 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                {buying ? 'Processing...' : (<><CreditCard size={16} /> Pay ₹{discountDetails ? discountDetails.finalPrice : product.price}</>)}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* UPI Payment */}
                                {paymentMethod === 'upi' && (
                                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>UPI Payment Details</h4>

                                        <div style={{ marginBottom: '16px' }}>
                                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pay to UPI ID:</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                                                <span style={{ flex: 1, fontWeight: '500', color: '#374151' }}>{UPI_ID}</span>
                                                <button onClick={() => copyToClipboard(UPI_ID)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {institute?.upi_qr_url && (
                                            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Or Scan QR Code:</p>
                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '10px',
                                                    background: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px'
                                                }}>
                                                    <img
                                                        src={institute.upi_qr_url}
                                                        alt="Scan to Pay"
                                                        style={{ width: '150px', height: '150px', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmitPayment}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '4px' }}>Enter Transaction ID / UTR</label>
                                                <input
                                                    type="text"
                                                    value={utr}
                                                    onChange={(e) => setUtr(e.target.value)}
                                                    placeholder="e.g. 123456789012"
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                                    required
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPayment(false)}
                                                    style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={buying}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        backgroundColor: 'var(--primary-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: '500',
                                                        cursor: buying ? 'not-allowed' : 'pointer',
                                                        opacity: buying ? 0.7 : 1
                                                    }}
                                                >
                                                    {buying ? 'Submitting...' : 'Submit'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#4b5563', fontSize: '14px' }}>
                            {product.validity && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} color="#6b7280" />
                                    <span>Validity: {product.validity}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProductDetail;
