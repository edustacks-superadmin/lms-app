'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useInstitute } from '../context/InstituteContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, ShoppingCart, Clock, Copy, CreditCard, Smartphone, Check, X, Play, FileText, Lock, Unlock, Eye, ChevronDown, ChevronUp, AlertCircle, Video, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { initializeRazorpayCheckout } from '../utils/razorpay';
import { pdfjs, Document, Page } from 'react-pdf';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

const StudentProductDetail = () => {
    const { id } = useParams();
    const router = useRouter();
    const { getProductById } = useProducts();
    const { createOrder, createRazorpayOrder, verifyRazorpayPayment, validateCoupon } = useTransactions();
    const { user } = useAuth();
    const { institute } = useInstitute();
    const { addToCart, isInCart } = useCart();
    const { showToast } = useToast();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'upi'
    const [utr, setUtr] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discountDetails, setDiscountDetails] = useState(null);
    const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Course Content & Preview State
    const [courseContent, setCourseContent] = useState([]);
    const [previewContent, setPreviewContent] = useState(null); // { type, url, title }
    const [expandedChapters, setExpandedChapters] = useState({});
    const [numPages, setNumPages] = useState(null);

    const UPI_ID = institute?.upi_id || "example@upi";

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        const result = await getProductById(id);
        if (result.success) {
            setProduct(result.data);
            fetchCourseContent(result.data.id);
        }
        setLoading(false);
    };

    const fetchCourseContent = async (productId) => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select(`
                    id, title, 
                    chapters (
                        id, name, order,
                        chapter_contents (
                            id, title, type, duration, free_preview, url, file_path, order
                        )
                    )
                `)
                .contains('allowed_products', [productId]);

            if (error) throw error;

            if (data) {
                // Sort chapters and contents
                const sortedCourses = data.map(course => ({
                    ...course,
                    chapters: course.chapters
                        ?.sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(chapter => ({
                            ...chapter,
                            chapter_contents: chapter.chapter_contents?.sort((a, b) => (a.order || 0) - (b.order || 0))
                        }))
                }));
                setCourseContent(sortedCourses);

                // Expand all chapters by default
                const allChapterIds = {};
                sortedCourses.forEach(c => c.chapters?.forEach(ch => allChapterIds[ch.id] = true));
                setExpandedChapters(allChapterIds);
            }
        } catch (err) {
            console.error('Error fetching course content:', err);
        }
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const handlePreview = (content) => {
        if (!content.free_preview) return;
        setPreviewContent(content);
        setNumPages(null); // Reset PDF page count
    };

    const closePreview = () => {
        setPreviewContent(null);
        setNumPages(null);
    };

    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleBuyClick = () => {
        if (!user) {
            showToast('Please login to purchase', 'error');
            return;
        }

        // If product is free, enroll directly
        if (product.price === 0) {
            handleFreeEnrollment();
            return;
        }

        setShowPayment(true);
    };

    const handleFreeEnrollment = async () => {
        setBuying(true);
        try {
            const orderData = {
                product_id: product.id,
                amount: 0,
                payment_method: 'free',
                status: 'completed',
                user_email: user.email,
                user_id: user.id
            };

            const res = await createOrder(orderData);
            if (res.success) {
                showToast('Successfully enrolled!', 'success');
                router.push('/student/courses');
            } else {
                showToast(res.error || 'Failed to enroll', 'error');
            }
        } catch (error) {
            console.error('Free enrollment error:', error);
            showToast('Something went wrong', 'error');
        } finally {
            setBuying(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponMessage({ type: '', text: '' });

        try {
            const res = await validateCoupon(couponCode, product.id, product.price);
            if (res.valid) {
                setDiscountDetails({
                    amount: res.discountAmount,
                    finalPrice: res.finalPrice,
                    offerId: res.offerId
                });
                setCouponMessage({ type: 'success', text: res.message || 'Coupon applied!' });
            } else {
                setCouponMessage({ type: 'error', text: res.message || 'Invalid coupon' });
                setDiscountDetails(null);
            }
        } catch (error) {
            console.error('Coupon validation error:', error);
            setCouponMessage({ type: 'error', text: 'Failed to validate coupon' });
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRazorpayPayment = async () => {
        if (!user) {
            showToast('Please login to purchase', 'error');
            return;
        }

        setBuying(true);
        try {
            const orderData = {
                product_id: product.id,
                amount: discountDetails ? discountDetails.finalPrice : product.price,
                offer_id: discountDetails?.offerId,
                payment_method: 'razorpay'
            };

            const res = await createRazorpayOrder(orderData);
            if (!res.success) throw new Error(res.error);

            const options = {
                key: institute?.razorpay_key_id,
                amount: res.amount,
                currency: res.currency,
                name: institute?.name || 'Academy',
                description: `Purchase of ${product.title}`,
                order_id: res.orderId,
                prefill: {
                    name: user.user_metadata?.full_name || '',
                    email: user.email || '',
                },
                handler: async (response) => {
                    const verificationData = {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        dbOrderId: res.dbOrderId
                    };

                    const verifyRes = await verifyRazorpayPayment(verificationData);
                    if (verifyRes.success) {
                        showToast('Payment Successful! Course enrolled.', 'success');
                        router.push('/student/courses');
                    } else {
                        showToast('Payment verification failed', 'error');
                        setBuying(false);
                    }
                },
                modal: {
                    ondismiss: () => setBuying(false)
                }
            };

            initializeRazorpayCheckout(options);
        } catch (error) {
            console.error('Razorpay payment error:', error);
            showToast(error.message || 'Payment failed', 'error');
            setBuying(false);
        }
    };

    const handleSubmitPayment = async (e) => {
        if (e) e.preventDefault();
        if (!utr.trim()) {
            showToast('Please enter UTR number', 'error');
            return;
        }

        setBuying(true);
        try {
            const orderData = {
                product_id: product.id,
                amount: discountDetails ? discountDetails.finalPrice : product.price,
                offer_id: discountDetails?.offerId,
                payment_method: 'upi',
                transaction_id: utr,
                status: 'pending',
                user_email: user.email,
                user_id: user.id
            };

            const res = await createOrder(orderData);
            if (res.success) {
                showToast('Payment submitted successfully! Waiting for admin approval.', 'success');
                setShowPayment(false);
                setUtr('');
                router.push('/student/store');
            } else {
                showToast(res.error || 'Failed to submit payment', 'error');
            }
        } catch (error) {
            console.error('Manual payment error:', error);
            showToast('Something went wrong', 'error');
        } finally {
            setBuying(false);
        }
    };

    const handleAddToCart = async () => {
        setAddingToCart(true);
        try {
            const res = await addToCart(product);
            if (res.success) {
                showToast('Added to cart!', 'success');
            } else {
                showToast(res.details || res.message || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            showToast('Something went wrong', 'error');
        } finally {
            setAddingToCart(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast('UPI ID copied to clipboard!', 'success');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                    <div className="text-slate-500 font-medium animate-pulse">Loading product details...</div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex items-center justify-center p-12 h-screen bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h2>
                    <p className="text-slate-500 mb-6">The course you are looking for does not exist or has been removed.</p>
                    <button
                        onClick={() => router.push('/student/store')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Browse Store
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen py-8 px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => router.push('/student/store')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Store
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
                                {product.title}
                            </h1>
                            {/* Product Tags */}
                            {product.product_tags && product.product_tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {product.product_tags.filter(tag => tag).map((tag, index) => (
                                        <span
                                            key={index}
                                            className="text-xs font-bold px-3 py-1 rounded-full"
                                            style={{
                                                backgroundColor: tag.color ? `${tag.color}20` : '#f3f4f6',
                                                color: tag.color || '#374151'
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white group aspect-video">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                        <ShoppingCart size={64} strokeWidth={1.5} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 border-b border-gray-100 pb-2">About this course</h3>
                            <div
                                className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600"
                                dangerouslySetInnerHTML={{ __html: product.description || product.short_description }}
                            />
                        </div>

                        {/* Course Content / Syllabus */}
                        {courseContent.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6">
                                <h3 className="text-xl font-bold text-slate-900 border-b border-gray-100 pb-2">Course Content</h3>

                                {courseContent.map(course => (
                                    <div key={course.id} className="space-y-4">
                                        {courseContent.length > 1 && <h4 className="font-bold text-lg text-slate-800">{course.title}</h4>}

                                        <div className="space-y-3">
                                            {course.chapters?.map(chapter => (
                                                <div key={chapter.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                    <button
                                                        onClick={() => toggleChapter(chapter.id)}
                                                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
                                                                <FileText size={18} />
                                                            </div>
                                                            <span className="font-bold text-slate-700">{chapter.name}</span>
                                                            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-white rounded-md border border-gray-200">
                                                                {chapter.chapter_contents?.length || 0} Lessons
                                                            </span>
                                                        </div>
                                                        {expandedChapters[chapter.id] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                    </button>

                                                    {expandedChapters[chapter.id] && (
                                                        <div className="divide-y divide-gray-100">
                                                            {chapter.chapter_contents?.length > 0 ? (
                                                                chapter.chapter_contents.map(content => (
                                                                    <div key={content.id} className="p-3 pl-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className={`p-1.5 rounded-full ${content.type === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                                {content.type === 'video' ? <Video size={14} fill="currentColor" /> : <FileText size={14} />}
                                                                            </div>
                                                                            <span className="text-sm font-medium text-slate-700 truncate">{content.title}</span>
                                                                        </div>

                                                                        {content.free_preview ? (
                                                                            <button
                                                                                onClick={() => handlePreview(content)}
                                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                                                                            >
                                                                                <Eye size={14} /> Preview
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400">
                                                                                <Lock size={14} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-slate-400 text-sm italic">No content in this chapter yet.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Checkout Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 space-y-6">
                            {/* Price Section */}
                            <div>
                                {product.strikethrough_price && !discountDetails && (
                                    <span className="text-sm text-slate-400 line-through font-medium block mb-1">
                                        ₹{product.strikethrough_price}
                                    </span>
                                )}
                                {discountDetails && (
                                    <span className="text-sm text-slate-400 line-through font-medium block mb-1">
                                        ₹{product.price}
                                    </span>
                                )}
                                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {discountDetails
                                        ? `₹${discountDetails.finalPrice}`
                                        : (product.price > 0 ? `₹${product.price}` : 'Free')
                                    }
                                </div>
                                <div className="text-sm text-emerald-600 font-bold mt-1">
                                    {discountDetails ? 'Coupon Applied!' : 'Includes all taxes'}
                                </div>
                            </div>

                            {/* Coupon Section */}
                            {!showPayment && (
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    {!discountDetails ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter Coupon Code"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                                            />
                                            <button
                                                onClick={handleApplyCoupon}
                                                disabled={validatingCoupon || !couponCode.trim()}
                                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {validatingCoupon ? '...' : 'Apply'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <span className="text-emerald-700 text-sm font-bold flex items-center gap-1">
                                                <Check size={14} strokeWidth={3} /> Saved ₹{discountDetails.amount}
                                            </span>
                                            <button
                                                onClick={() => { setDiscountDetails(null); setCouponCode(''); setCouponMessage({ type: '', text: '' }); }}
                                                className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                    {couponMessage.text && (
                                        <p className={`text-xs font-medium ${couponMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {couponMessage.text}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!showPayment ? (
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={addingToCart || isInCart(product.id)}
                                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isInCart(product.id)
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                            : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-blue-600/5 active:scale-[0.98]'
                                            }`}
                                    >
                                        {addingToCart ? 'Adding...' : isInCart(product.id) ? (
                                            <>
                                                <Check size={22} />
                                                In Cart
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={22} />
                                                Add to Cart
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleBuyClick}
                                        className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart size={22} />
                                        {product.price > 0 ? 'Enroll Now' : 'Start Learning'}
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-fade-in space-y-6">
                                    {/* Payment Method Selection */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Payment Method</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMethod('razorpay')}
                                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${paymentMethod === 'razorpay'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-gray-100 bg-white text-slate-500 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <CreditCard size={24} className={paymentMethod === 'razorpay' ? 'text-blue-600' : 'text-slate-400'} />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">Online</span>
                                                    <span className="text-[10px] opacity-70">Instant Access</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('upi')}
                                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${paymentMethod === 'upi'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-gray-100 bg-white text-slate-500 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Smartphone size={24} className={paymentMethod === 'upi' ? 'text-blue-600' : 'text-slate-400'} />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">Manual UPI</span>
                                                    <span className="text-[10px] opacity-70">Admin Approval</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Razorpay Section */}
                                    {paymentMethod === 'razorpay' && (
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center space-y-4">
                                            <p className="text-sm text-slate-500">
                                                Pay securely with Razorpay (UPI, Cards, NetBanking).
                                                <br />
                                                <span className="font-bold text-slate-700">Instant course access guaranteed.</span>
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowPayment(false)}
                                                    className="flex-1 py-2.5 px-4 bg-white text-slate-700 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleRazorpayPayment}
                                                    disabled={buying}
                                                    className="flex-[2] py-2.5 px-4 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {buying ? (
                                                        <>Processing...</>
                                                    ) : (
                                                        <>Pay ₹{discountDetails ? discountDetails.finalPrice : product.price}</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual UPI Section */}
                                    {paymentMethod === 'upi' && (
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 bg-gray-100">
                                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                                    <span className="font-mono text-sm font-bold text-slate-700">{UPI_ID}</span>
                                                    <button onClick={() => copyToClipboard(UPI_ID)} className="text-blue-600 hover:text-blue-700 p-1">
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                                {institute?.upi_qr_url && (
                                                    <div className="mt-4 flex justify-center">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                                                            <img
                                                                src={institute.upi_qr_url}
                                                                alt="Scan to Pay"
                                                                className="w-32 h-32 object-contain"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <form onSubmit={handleSubmitPayment} className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enter UTR / Transaction ID</label>
                                                    <input
                                                        type="text"
                                                        value={utr}
                                                        onChange={(e) => setUtr(e.target.value)}
                                                        placeholder="e.g. 123456789012"
                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPayment(false)}
                                                        className="flex-1 py-2.5 bg-white text-slate-700 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={buying}
                                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {buying ? 'Submitting...' : 'Submit Payment'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}

                            {product.validity && (
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium pt-2 border-t border-gray-50 justify-center">
                                    <Clock size={16} />
                                    <span>Course Validity: <span className="text-slate-900 font-bold">{product.validity}</span></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewContent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={closePreview}>
                    <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                {previewContent.type === 'video' ? <Video size={20} className="text-blue-600" /> : <FileText size={20} className="text-orange-600" />}
                                {previewContent.title}
                                <span className="text-xs uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold tracking-wider">Preview</span>
                            </h3>
                            <button onClick={closePreview} className="p-2 hover:bg-gray-200 rounded-full text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-black/90 flex items-center justify-center relative min-h-[60vh] overflow-auto custom-scrollbar">
                            {previewContent.type === 'video' ? (
                                previewContent.url && (
                                    <iframe
                                        src={previewContent.url.replace("youtu.be/", "youtube.com/embed/").replace("watch?v=", "embed/")}
                                        className="w-full aspect-video"
                                        allowFullScreen
                                        title={previewContent.title}
                                        style={{ maxWidth: '100%' }}
                                    />
                                )
                            ) : (
                                previewContent.url ? (
                                    <div
                                        className="w-full max-h-[80vh] overflow-y-auto flex justify-center bg-gray-900 select-none pb-8"
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        <Document
                                            file={`/api/proxy-pdf?id=${previewContent.id}`}
                                            onLoadSuccess={handleDocumentLoadSuccess}
                                            className="flex flex-col gap-4 py-4"
                                            loading={
                                                <div className="text-white flex flex-col items-center gap-2 py-10">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                                                    <p>Loading Secure PDF...</p>
                                                </div>
                                            }
                                            error={(error) => (
                                                <div className="text-red-400 text-center py-10 px-4">
                                                    <p className="font-bold mb-2">Failed to load PDF.</p>
                                                    <p className="text-sm opacity-75">{error?.message || 'An error occurred.'}</p>
                                                    <button
                                                        onClick={() => window.open(previewContent.url, '_blank')}
                                                        className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                                                    >
                                                        Open in New Tab (Fallback)
                                                    </button>
                                                </div>
                                            )}
                                        >
                                            {numPages && Array.from(new Array(numPages), (el, index) => (
                                                <Page
                                                    key={`page_${index + 1}`}
                                                    pageNumber={index + 1}
                                                    width={Math.min(window.innerWidth * 0.9, 800)} // Responsive width
                                                    renderTextLayer={false} // Disable text selection
                                                    renderAnnotationLayer={false} // Disable links/annotations
                                                    className="shadow-lg"
                                                />
                                            ))}
                                        </Document>
                                    </div>
                                ) : (
                                    <div className="text-white text-center p-8">
                                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Preview not available for this file type.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProductDetail;
