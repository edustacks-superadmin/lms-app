'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import {
    CreditCard,
    Smartphone,
    ChevronRight,
    ShoppingCart,
    CheckCircle2,
    ArrowLeft,
    ShieldCheck,
    Ticket,
    Loader2,
    Package,
    AlertCircle,
    Copy,
    Check
} from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useTransactions } from '../../../context/TransactionContext';
import { useToast } from '../../../context/ToastContext';
import { useInstitute } from '../../../context/InstituteContext';
import { useAuth } from '../../../context/AuthContext';
import ProfileCompletionModal from '../../../components/ProfileCompletionModal';

const CheckoutPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { cartItems, cartTotal, cartCount, clearCart, initialized } = useCart();
    const { createRazorpayOrder, verifyRazorpayPayment, createOrder, validateCoupon, loading: transactionLoading } = useTransactions();
    const { showToast } = useToast();
    const { institute } = useInstitute();
    const { user: currentUser } = useAuth();

    // State
    const [checkoutItems, setCheckoutItems] = useState([]);
    const [subtotal, setSubtotal] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [couponCode, setCouponCode] = useState('');
    const [discountDetails, setDiscountDetails] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [utr, setUtr] = useState('');
    const [orderComplete, setOrderComplete] = useState(false);
    const [copied, setCopied] = useState(false);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [missingFields, setMissingFields] = useState([]);

    const UPI_ID = institute?.upi_id || 'maheshies@okaxis';

    useEffect(() => {
        if (!initialized) return;

        // Check if we are checking out a single product (from "Enroll Now")
        const singleProductId = searchParams.get('product_id');
        if (singleProductId) {
            // Find item in cart or just use it if passed (advanced: fetch it)
            const item = cartItems.find(i => (i.product_id || i.id) === parseInt(singleProductId));
            if (item) {
                setCheckoutItems([item]);
                setSubtotal(parseFloat(item.price || 0));
            } else {
                // Handle direct buy if not in cart - we might need to fetch from store
                // For now, if it's not in cart, we'll try to use cart items as default
                setCheckoutItems(cartItems);
                setSubtotal(cartTotal);
            }
        } else {
            setCheckoutItems(cartItems);
            setSubtotal(cartTotal);
        }
    }, [initialized, cartItems, cartTotal, searchParams]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        setIsValidatingCoupon(true);
        try {
            const productIds = checkoutItems.map(item => item.product_id || item.id);
            // Updated: pass actual productIds array to the validation API via wrapper
            const res = await validateCoupon(couponCode, null, subtotal, productIds);

            if (res.valid) {
                setDiscountDetails(res);
                showToast(`Coupon applied! Saved ₹${res.discountAmount}`, 'success');
            } else {
                showToast(res.message || 'Invalid coupon code', 'error');
                setDiscountDetails(null);
            }
        } catch (err) {
            showToast('Failed to validate coupon', 'error');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRazorpayPayment = async () => {
        if (!window.Razorpay) {
            showToast('Payment gateway is loading. Please try again in a moment.', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const productIds = checkoutItems.map(item => item.product_id || item.id);

            const res = await createRazorpayOrder({
                productIds,
                userId: currentUser?.id,
                userEmail: currentUser?.email,
                couponCode: discountDetails?.valid ? couponCode : null
            });

            if (!res.success) {
                if (res.requires_action === 'complete_profile') {
                    setMissingFields(res.missing_fields || []);
                    setIsProfileModalOpen(true);
                    setIsProcessing(false);
                    return;
                }
                throw new Error(res.error);
            }

            const options = {
                key: res.keyId,
                amount: res.amount,
                currency: res.currency,
                name: institute?.name || 'LMS Platform',
                description: `Payment for ${checkoutItems.length} courses`,
                order_id: res.orderId,
                handler: async (response) => {
                    const verifyRes = await verifyRazorpayPayment({
                        orderId: response.razorpay_order_id,
                        paymentId: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                        dbOrderId: res.dbOrderId
                    });

                    if (verifyRes.success) {
                        setOrderComplete(true);
                        clearCart();
                        showToast('Payment successful! Courses activated.', 'success');
                    } else {
                        showToast('Payment verification failed', 'error');
                    }
                    setIsProcessing(false);
                },
                prefill: {
                    name: currentUser?.name || '',
                    email: currentUser?.email || '',
                },
                theme: {
                    color: '#2563eb'
                },
                modal: {
                    ondismiss: () => setIsProcessing(false)
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            showToast(err.message || 'Payment failed', 'error');
            setIsProcessing(false);
        }
    };

    const handleManualUPI = async (e) => {
        e.preventDefault();
        if (!utr.trim()) {
            showToast('Please enter UTR/Transaction ID', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            // Note: Our current createOrder context helper might need update for bulk.
            // For now, we'll submit one order per product for manual UPI as well.
            const productIds = checkoutItems.map(item => item.product_id || item.id);

            // We'll call the manual order creation for each item
            // Ideally we'd have a bulk createOrder API, but let's work with what we have.
            const finalPrice = discountDetails ? discountDetails.finalPrice : subtotal;
            const itemPrice = finalPrice / checkoutItems.length;

            const promises = checkoutItems.map(item =>
                createOrder({
                    member_id: currentUser?.id,
                    user_id: currentUser?.id,
                    user_email: currentUser?.email,
                    product_id: item.product_id || item.id,
                    amount: itemPrice,
                    status: 'pending',
                    payment_method: 'upi',
                    payment_notes: `UTR: ${utr}${couponCode ? ` (Coupon: ${couponCode})` : ''}`,
                    coupon_code: couponCode || null,
                    institute_id: institute?.id
                })
            );

            await Promise.all(promises);
            setOrderComplete(true);
            clearCart();
            showToast('Payment submitted for approval', 'success');
        } catch (err) {
            showToast('Failed to submit payment', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-2xl shadow-slate-200">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Order Confirmed!</h1>
                    <p className="text-slate-500 mb-8">
                        {paymentMethod === 'razorpay'
                            ? 'Your courses are now active. Start learning today!'
                            : 'Your payment is under review. You\'ll get access once approved.'}
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/student/courses')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all active:scale-95"
                        >
                            Go to My Courses
                        </button>
                        <button
                            onClick={() => router.push('/student/dashboard')}
                            className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (checkoutItems.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading checkout...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => {
                    console.log('Razorpay SDK loaded successfully');
                    setRazorpayLoaded(true);
                }}
                onError={(e) => {
                    console.error('Failed to load Razorpay SDK:', e);
                    showToast('Failed to load payment gateway', 'error');
                }}
            />
            <ProfileCompletionModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                missingFields={missingFields}
                onSuccess={() => {
                    // Optional: could auto-retry here
                }}
            />
            <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => router.back()}
                            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
                            <p className="text-slate-500">Complete your purchase to start learning</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Order Summary Section */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <ShoppingCart size={20} className="text-blue-600" />
                                        Review Items ({checkoutItems.length})
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {checkoutItems.map((item) => (
                                        <div key={item.product_id || item.id} className="flex gap-4 items-center">
                                            <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <Package size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 truncate text-sm">{item.title}</h3>
                                                <p className="text-blue-600 font-bold text-sm">₹{item.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method Section */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-xl font-bold text-slate-900">Select Payment Method</h2>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setPaymentMethod('razorpay')}
                                            className={`p-6 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${paymentMethod === 'razorpay'
                                                ? 'border-blue-600 bg-blue-50/50'
                                                : 'border-slate-100 hover:border-slate-200'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${paymentMethod === 'razorpay' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">Online Payment</h3>
                                                <p className="text-sm text-slate-500 mt-1">Pay via UPI, Cards, NetBanking. Instant Access.</p>
                                            </div>
                                            {paymentMethod === 'razorpay' && <CheckCircle2 size={20} className="ml-auto text-blue-600" />}
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod('upi')}
                                            className={`p-6 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${paymentMethod === 'upi'
                                                ? 'border-blue-600 bg-blue-50/50'
                                                : 'border-slate-100 hover:border-slate-200'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-xl ${paymentMethod === 'upi' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <Smartphone size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">Manual UPI</h3>
                                                <p className="text-sm text-slate-500 mt-1">Pay to ID/QR and upload UTR. Admin Activation.</p>
                                            </div>
                                            {paymentMethod === 'upi' && <CheckCircle2 size={20} className="ml-auto text-blue-600" />}
                                        </button>
                                    </div>

                                    {paymentMethod === 'upi' && (
                                        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                <div className="flex-1 space-y-4">
                                                    <h4 className="font-bold text-slate-800">Scan QR or Pay to UPI ID</h4>
                                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                                                        <code className="text-blue-600 font-mono font-bold">{UPI_ID}</code>
                                                        <button
                                                            onClick={() => copyToClipboard(UPI_ID)}
                                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                                        >
                                                            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enter Transaction ID (UTR)</label>
                                                            <input
                                                                type="text"
                                                                value={utr}
                                                                onChange={(e) => setUtr(e.target.value)}
                                                                placeholder="12 digit UTR number"
                                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-slate-400 italic">Access will be provided within 2-4 hours after admin verification.</p>
                                                    </div>
                                                </div>
                                                {institute?.upi_qr_url && (
                                                    <div className="w-40 h-40 bg-white p-3 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100">
                                                        <img src={institute.upi_qr_url} alt="UPI QR" className="w-full h-full object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24 overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h2 className="text-xl font-bold text-slate-900">Payment Summary</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Coupon Section */}
                                    <div className="pb-4 border-b border-slate-100">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Have a Coupon Code?</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="ENTER CODE"
                                                    disabled={discountDetails}
                                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-all font-bold uppercase tracking-widest placeholder:text-slate-300"
                                                />
                                            </div>
                                            {discountDetails ? (
                                                <button
                                                    onClick={() => { setDiscountDetails(null); setCouponCode(''); }}
                                                    className="text-xs font-bold text-red-500 hover:text-red-600 px-2"
                                                >
                                                    Remove
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={isValidatingCoupon || !couponCode}
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center min-w-[80px]"
                                                >
                                                    {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amounts */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-slate-600 text-sm">
                                            <span>Subtotal</span>
                                            <span>₹{subtotal}</span>
                                        </div>
                                        {discountDetails && (
                                            <div className="flex justify-between text-emerald-600 text-sm font-bold">
                                                <span>Coupon Discount</span>
                                                <span>-₹{discountDetails.discountAmount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-600 text-sm">
                                            <span>Tax & Fees</span>
                                            <span className="text-xs uppercase font-bold text-slate-400 italic">Included</span>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                                            <span className="font-bold text-slate-900">Total Amount</span>
                                            <span className="text-3xl font-black text-blue-600">
                                                ₹{discountDetails ? discountDetails.finalPrice : subtotal}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={paymentMethod === 'razorpay' ? handleRazorpayPayment : handleManualUPI}
                                        disabled={isProcessing || (paymentMethod === 'razorpay' && !razorpayLoaded)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (paymentMethod === 'razorpay' && !razorpayLoaded) ? (
                                            <>
                                                <Loader2 size={22} className="animate-spin" />
                                                Loading Payment Gateway...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={22} />
                                                {paymentMethod === 'razorpay' ? 'Secure Pay' : 'Submit Proof'}
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-4 py-4">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4 grayscale opacity-30" alt="PayPal" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6 grayscale opacity-30" alt="Mastercard" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3 grayscale opacity-30" alt="Visa" />
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                                            By proceeding, you agree to our Terms of Service and Refund Policy.
                                            All transactions are encrypted and secure.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CheckoutPage;
