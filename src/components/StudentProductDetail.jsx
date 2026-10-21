import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useInstitute } from '../context/InstituteContext';
import {
    ArrowLeft, ShoppingCart, Clock, Copy, CreditCard, Smartphone, Check,
    BookOpen, Layers, ChevronDown, ChevronUp, ChevronRight, Folder, FolderOpen,
    FileText, Video, FileQuestion, Lock, PlayCircle, Search, Sparkles, CheckCircle2,
    Award, HelpCircle, File, Eye, X
} from 'lucide-react';
import { initializeRazorpayCheckout } from '../utils/razorpay';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';
import PDFViewer from './PDFViewer';

const StudentProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getProductById } = useProducts();
    const { createOrder, createRazorpayOrder, verifyRazorpayPayment, validateCoupon } = useTransactions();
    const { user } = useAuth();
    const { institute } = useInstitute();
    const { addToCart, isInCart, openCart } = useCart();
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

    // Curriculum state
    const [curriculumCourses, setCurriculumCourses] = useState([]);
    const [curriculumLoading, setCurriculumLoading] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState({});
    const [chapterSearch, setChapterSearch] = useState('');
    const [activeCourseIndex, setActiveCourseIndex] = useState(0);

    // Free Preview Modals State
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

    const handlePreviewContent = (item) => {
        if (!item.free_preview) return;
        const targetUrl = item.url || item.content_url;
        if (item.type === 'pdf' || item.type === 'document' || item.type === 'notes' || item.type === 'file') {
            if (targetUrl) {
                setPreviewPdfUrl(targetUrl);
            } else {
                alert('Preview file is not available.');
            }
        } else if (item.type === 'video') {
            if (targetUrl) {
                setPreviewVideoUrl(targetUrl);
            } else {
                alert('Preview video is not available.');
            }
        } else if (item.type === 'exam') {
            navigate(`/student/exam/${item.exam_id || targetUrl}/take`);
        } else if (targetUrl) {
            window.open(targetUrl, '_blank');
        }
    };

    const isManualPaymentEnabled = institute?.feature_flags?.manualPaymentEnabled !== false;

    // Reset to razorpay if manual payments are disabled
    useEffect(() => {
        if (!isManualPaymentEnabled && paymentMethod === 'upi') {
            setPaymentMethod('razorpay');
        }
    }, [isManualPaymentEnabled, paymentMethod]);

    const UPI_ID = institute?.upi_id || "example@upi";

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadCurriculum = async (productData) => {
        setCurriculumLoading(true);
        try {
            // Fetch courses
            const { data: allCourses, error: courseErr } = await supabase
                .from('courses')
                .select('id, title, description, allowed_products, institute_id')
                .or('is_archived.is.null,is_archived.eq.false');

            if (courseErr) throw courseErr;

            // Match courses linked to this product:
            // 1. By allowed_products array
            // 2. By matching title (case-insensitive)
            const matchedCourses = (allCourses || []).filter(c => {
                const allowed = Array.isArray(c.allowed_products) ? c.allowed_products : [];
                const matchesId = allowed.some(pId => String(pId) === String(productData.id));
                const matchesTitle = c.title && productData.title &&
                    c.title.trim().toLowerCase() === productData.title.trim().toLowerCase();
                return matchesId || matchesTitle;
            });

            if (matchedCourses.length === 0) {
                setCurriculumCourses([]);
                setCurriculumLoading(false);
                return;
            }

            const courseIds = matchedCourses.map(c => c.id);

            // Fetch all chapters for these courses
            const { data: chaptersData, error: chErr } = await supabase
                .from('chapters')
                .select('id, name, order, course_id, parent_id, icon')
                .in('course_id', courseIds)
                .order('order', { ascending: true });

            if (chErr) throw chErr;

            // Fetch chapter contents for these chapters
            const chapterIds = (chaptersData || []).map(ch => ch.id);
            let contentsData = [];
            if (chapterIds.length > 0) {
                const { data: contents, error: cntErr } = await supabase
                    .from('chapter_contents')
                    .select(`
                        id,
                        title,
                        type,
                        url,
                        duration,
                        is_locked,
                        free_preview,
                        chapter_id,
                        order,
                        exam_id,
                        exams ( id, title, duration_minutes, total_marks, number_of_questions )
                    `)
                    .in('chapter_id', chapterIds)
                    .order('order', { ascending: true });

                if (!cntErr && contents) {
                    contentsData = contents;
                }
            }

            // Build hierarchical tree per course
            const coursesWithCurriculum = matchedCourses.map(course => {
                const courseChapters = (chaptersData || []).filter(ch => ch.course_id === course.id);
                const courseChapterIds = new Set(courseChapters.map(ch => ch.id));

                // Root chapters: parent_id is null or not in this course's chapters
                const rootChapters = courseChapters.filter(ch => !ch.parent_id || !courseChapterIds.has(ch.parent_id));
                
                const subChaptersMap = {};
                courseChapters.forEach(ch => {
                    if (ch.parent_id && courseChapterIds.has(ch.parent_id)) {
                        if (!subChaptersMap[ch.parent_id]) {
                            subChaptersMap[ch.parent_id] = [];
                        }
                        subChaptersMap[ch.parent_id].push(ch);
                    }
                });

                const contentsMap = {};
                contentsData.forEach(cnt => {
                    if (!contentsMap[cnt.chapter_id]) {
                        contentsMap[cnt.chapter_id] = [];
                    }
                    contentsMap[cnt.chapter_id].push(cnt);
                });

                const tree = rootChapters.map(root => {
                    const subChapters = (subChaptersMap[root.id] || []).map(sub => ({
                        ...sub,
                        contents: contentsMap[sub.id] || []
                    }));
                    return {
                        ...root,
                        contents: contentsMap[root.id] || [],
                        subChapters
                    };
                });

                const totalChaptersCount = courseChapters.length;
                const totalContentsCount = courseChapters.reduce((acc, ch) => acc + (contentsMap[ch.id]?.length || 0), 0);
                const totalVideosCount = courseChapters.reduce((acc, ch) =>
                    acc + (contentsMap[ch.id]?.filter(c => c.type === 'video').length || 0), 0);
                const totalPDFsCount = courseChapters.reduce((acc, ch) =>
                    acc + (contentsMap[ch.id]?.filter(c => c.type === 'pdf' || c.type === 'document' || c.type === 'notes').length || 0), 0);
                const totalExamsCount = courseChapters.reduce((acc, ch) =>
                    acc + (contentsMap[ch.id]?.filter(c => c.type === 'exam' || c.exam_id).length || 0), 0);

                return {
                    ...course,
                    tree,
                    allChapters: courseChapters,
                    totalChaptersCount,
                    totalContentsCount,
                    totalVideosCount,
                    totalPDFsCount,
                    totalExamsCount
                };
            });

            setCurriculumCourses(coursesWithCurriculum);

            // Initially expand the root chapters
            const initialExpanded = {};
            coursesWithCurriculum.forEach(c => {
                (c.tree || []).slice(0, 5).forEach(ch => {
                    initialExpanded[ch.id] = true;
                });
            });
            setExpandedChapters(initialExpanded);
        } catch (err) {
            console.error('Error loading curriculum:', err);
        } finally {
            setCurriculumLoading(false);
        }
    };

    const loadProduct = async () => {
        const result = await getProductById(id);
        if (result.success) {
            setProduct(result.data);
            loadCurriculum(result.data);
        } else {
            setCurriculumLoading(false);
        }
        setLoading(false);
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const expandAll = (tree) => {
        const next = {};
        (tree || []).forEach(ch => {
            next[ch.id] = true;
            (ch.subChapters || []).forEach(sub => {
                next[sub.id] = true;
            });
        });
        setExpandedChapters(next);
    };

    const collapseAll = () => {
        setExpandedChapters({});
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

    const renderContentIcon = (type) => {
        switch (type) {
            case 'video':
                return <Video size={16} color="#2563eb" />;
            case 'exam':
                return <FileQuestion size={16} color="#059669" />;
            case 'pdf':
            case 'notes':
            case 'document':
                return <FileText size={16} color="#dc2626" />;
            default:
                return <File size={16} color="#64748b" />;
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading product...</div>;
    if (!product) return <div style={{ padding: '40px', textAlign: 'center' }}>Product not found</div>;

    const cleanDescription = (product.description || '')
        .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '')
        .trim();

    const displayDescription = cleanDescription
        ? cleanDescription
        : (product.short_description?.trim()
            ? `<p>${product.short_description}</p>`
            : (product.meta_description?.trim()
                ? `<p>${product.meta_description}</p>`
                : `<p>Comprehensive course designed with structured chapters, topicwise practice questions, study notes, and exams to maximize student preparation and scoring performance.</p>`));

    const currentCourse = curriculumCourses[activeCourseIndex] || curriculumCourses[0];

    // Filter chapters if search query is entered
    const getFilteredTree = (tree = []) => {
        if (!chapterSearch.trim()) return tree;
        const q = chapterSearch.toLowerCase().trim();
        return tree.filter(ch => {
            const matchChapter = ch.name?.toLowerCase().includes(q);
            const matchSub = (ch.subChapters || []).some(sub => sub.name?.toLowerCase().includes(q));
            const matchContent = (ch.contents || []).some(cnt => cnt.title?.toLowerCase().includes(q));
            return matchChapter || matchSub || matchContent;
        });
    };

    const filteredTree = currentCourse ? getFilteredTree(currentCourse.tree) : [];

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
                    <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a1a', lineHeight: '1.25' }}>
                        {product.title}
                    </h1>

                    {product.image && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #e5e7eb', aspectRatio: '16/9' }}>
                            <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    {/* About this course */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>About this course</h3>
                        <div
                            dangerouslySetInnerHTML={{ __html: displayDescription }}
                            style={{ lineHeight: '1.6', color: '#4b5563', fontSize: '15px' }}
                        />
                    </div>

                    {/* Course Curriculum / Chapter List */}
                    <div style={{ marginBottom: '36px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                        Course Curriculum
                                    </h3>
                                    {currentCourse && currentCourse.totalChaptersCount > 0 && (
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb'
                                        }}>
                                            {currentCourse.totalChaptersCount} {currentCourse.totalChaptersCount === 1 ? 'Chapter' : 'Chapters'}
                                        </span>
                                    )}
                                </div>
                                {currentCourse && (
                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                                        {currentCourse.totalContentsCount > 0 && `${currentCourse.totalContentsCount} ${currentCourse.totalContentsCount === 1 ? 'Lesson' : 'Lessons'} • `}
                                        {currentCourse.totalExamsCount > 0 && `${currentCourse.totalExamsCount} ${currentCourse.totalExamsCount === 1 ? 'Test' : 'Tests'} • `}
                                        {currentCourse.totalPDFsCount > 0 && `${currentCourse.totalPDFsCount} ${currentCourse.totalPDFsCount === 1 ? 'PDF' : 'PDFs'} • `}
                                        Full syllabus access
                                    </p>
                                )}
                            </div>

                            {currentCourse && currentCourse.tree?.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => expandAll(currentCourse.tree)}
                                        style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#475569',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Expand all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAll}
                                        style={{
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#475569',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Collapse all
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* If bundled course package (multiple courses) */}
                        {curriculumCourses.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                                {curriculumCourses.map((c, idx) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setActiveCourseIndex(idx)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '20px',
                                            border: activeCourseIndex === idx ? '1px solid #2563eb' : '1px solid #e5e7eb',
                                            backgroundColor: activeCourseIndex === idx ? '#eff6ff' : 'white',
                                            color: activeCourseIndex === idx ? '#2563eb' : '#4b5563',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {c.title} ({c.totalChaptersCount})
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search Filter if more than 4 chapters */}
                        {currentCourse && currentCourse.tree?.length > 4 && (
                            <div style={{ position: 'relative', marginBottom: '14px' }}>
                                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    value={chapterSearch}
                                    onChange={(e) => setChapterSearch(e.target.value)}
                                    placeholder="Search chapters or topics..."
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px 9px 34px',
                                        fontSize: '13px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        )}

                        {/* Curriculum Content */}
                        {curriculumLoading ? (
                            <div style={{
                                padding: '32px',
                                textAlign: 'center',
                                backgroundColor: '#f9fafb',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                color: '#6b7280',
                                fontSize: '14px'
                            }}>
                                Loading course chapters...
                            </div>
                        ) : filteredTree.length > 0 ? (
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                            }}>
                                {filteredTree.map((chapter, chIdx) => {
                                    const isExpanded = !!expandedChapters[chapter.id];
                                    const subChaptersCount = chapter.subChapters ? chapter.subChapters.length : 0;
                                    const directContentsCount = chapter.contents ? chapter.contents.length : 0;

                                    let subtitle = 'Study Module';
                                    if (subChaptersCount > 0 && directContentsCount > 0) {
                                        subtitle = `${subChaptersCount} ${subChaptersCount === 1 ? 'Sub-chapter' : 'Sub-chapters'} • ${directContentsCount} ${directContentsCount === 1 ? 'Item' : 'Items'}`;
                                    } else if (subChaptersCount > 0) {
                                        subtitle = `${subChaptersCount} ${subChaptersCount === 1 ? 'Topic' : 'Topics'}`;
                                    } else if (directContentsCount > 0) {
                                        subtitle = `${directContentsCount} ${directContentsCount === 1 ? 'Lesson' : 'Lessons'}`;
                                    } else {
                                        subtitle = 'Study Material Included';
                                    }

                                    return (
                                        <div
                                            key={chapter.id}
                                            style={{
                                                borderBottom: chIdx === filteredTree.length - 1 && !isExpanded ? 'none' : '1px solid #e2e8f0'
                                            }}
                                        >
                                            {/* Chapter Row Header */}
                                            <div
                                                onClick={() => toggleChapter(chapter.id)}
                                                style={{
                                                    padding: '14px 18px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    backgroundColor: isExpanded ? '#f8fafc' : 'white',
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseOver={(e) => {
                                                    if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
                                                }}
                                                onMouseOut={(e) => {
                                                    if (!isExpanded) e.currentTarget.style.backgroundColor = 'white';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                                    <div style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        backgroundColor: isExpanded ? '#dbeafe' : '#f1f5f9',
                                                        color: isExpanded ? '#1d4ed8' : '#475569',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        flexShrink: 0
                                                    }}>
                                                        {String(chIdx + 1).padStart(2, '0')}
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <h4 style={{
                                                            fontSize: '15px',
                                                            fontWeight: '600',
                                                            color: '#0f172a',
                                                            margin: 0,
                                                            lineHeight: '1.3'
                                                        }}>
                                                            {chapter.name}
                                                        </h4>
                                                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'inline-block' }}>
                                                            {subtitle}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>

                                            {/* Collapsible Body */}
                                            {isExpanded && (
                                                <div style={{
                                                    backgroundColor: '#ffffff',
                                                    borderTop: '1px solid #f1f5f9'
                                                }}>
                                                    {/* If Sub-chapters exist */}
                                                    {chapter.subChapters && chapter.subChapters.length > 0 && (
                                                        <div>
                                                            {chapter.subChapters.map((sub, sIdx) => (
                                                                <div
                                                                    key={sub.id}
                                                                    style={{
                                                                        padding: '12px 18px 12px 34px',
                                                                        borderBottom: '1px solid #f8fafc',
                                                                        backgroundColor: '#fafbfc'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <Folder size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                                                                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', flex: 1 }}>
                                                                            {sub.name}
                                                                        </span>
                                                                        {sub.contents && sub.contents.length > 0 && (
                                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                                {sub.contents.length} {sub.contents.length === 1 ? 'item' : 'items'}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Nested contents of this subchapter */}
                                                                    {sub.contents && sub.contents.length > 0 && (
                                                                        <div style={{ marginTop: '8px', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                            {sub.contents.map((item) => (
                                                                                <div
                                                                                    key={item.id}
                                                                                    onClick={() => item.free_preview && handlePreviewContent(item)}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'space-between',
                                                                                        padding: '6px 10px',
                                                                                        borderRadius: '6px',
                                                                                        backgroundColor: item.free_preview ? '#f0fdf4' : 'white',
                                                                                        border: item.free_preview ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                                                                        fontSize: '13px',
                                                                                        cursor: item.free_preview ? 'pointer' : 'default',
                                                                                        transition: 'all 0.15s ease'
                                                                                    }}
                                                                                    title={item.free_preview ? 'Click to preview' : 'Locked content'}
                                                                                >
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                                                        {renderContentIcon(item.type)}
                                                                                        <span style={{ color: item.free_preview ? '#166534' : '#334155', fontWeight: item.free_preview ? '500' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                            {item.title}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                                        {item.free_preview ? (
                                                                                            <>
                                                                                                <span style={{
                                                                                                    fontSize: '10px',
                                                                                                    fontWeight: '700',
                                                                                                    padding: '2px 6px',
                                                                                                    borderRadius: '4px',
                                                                                                    backgroundColor: '#dcfce7',
                                                                                                    color: '#15803d',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '3px'
                                                                                                }}>
                                                                                                    <Eye size={10} /> Preview
                                                                                                </span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <Lock size={12} color="#94a3b8" />
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Direct Contents of this chapter */}
                                                    {chapter.contents && chapter.contents.length > 0 && (
                                                        <div style={{ padding: '8px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {chapter.contents.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => item.free_preview && handlePreviewContent(item)}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '8px 12px',
                                                                        borderRadius: '8px',
                                                                        backgroundColor: item.free_preview ? '#f0fdf4' : '#f8fafc',
                                                                        border: item.free_preview ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                                                        fontSize: '13px',
                                                                        cursor: item.free_preview ? 'pointer' : 'default',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    title={item.free_preview ? 'Click to preview' : 'Locked content'}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                                        {renderContentIcon(item.type)}
                                                                        <span style={{ color: item.free_preview ? '#166534' : '#334155', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {item.title}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                        {item.duration && (
                                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                                {item.duration}
                                                                            </span>
                                                                        )}
                                                                        {item.free_preview ? (
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                fontWeight: '700',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                backgroundColor: '#dcfce7',
                                                                                color: '#15803d',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '3px'
                                                                            }}>
                                                                                <Eye size={10} /> Preview
                                                                            </span>
                                                                        ) : (
                                                                            <Lock size={13} color="#94a3b8" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* If no subchapters and no contents directly */}
                                                    {(!chapter.subChapters || chapter.subChapters.length === 0) &&
                                                     (!chapter.contents || chapter.contents.length === 0) && (
                                                        <div style={{
                                                            padding: '14px 20px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: '#fafbfc',
                                                            fontSize: '13px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                                                                <FileText size={16} color="#3b82f6" />
                                                                <div>
                                                                    <span style={{ fontWeight: '500', color: '#1e293b' }}>
                                                                        {chapter.name} Study Notes & Questions
                                                                    </span>
                                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                                        Comprehensive materials & solutions included in course
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                                                <Lock size={13} color="#94a3b8" />
                                                                <span>Enrolled only</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{
                                padding: '24px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center'
                            }}>
                                <BookOpen size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                                <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#334155', margin: '0 0 4px 0' }}>
                                    Comprehensive Course Curriculum
                                </h4>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    Includes complete chapterwise learning materials, practice questions, and exam preparation resources.
                                </p>
                            </div>
                        )}
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
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => {
                                        if (isInCart(product.id)) {
                                            openCart();
                                        } else {
                                            addToCart(product);
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: isInCart(product.id) ? '#ecfdf5' : '#eff6ff',
                                        border: `1.5px solid ${isInCart(product.id) ? '#10b981' : '#2563eb'}`,
                                        borderRadius: '8px',
                                        color: isInCart(product.id) ? '#059669' : '#2563eb',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isInCart(product.id) ? <Check size={18} /> : <ShoppingCart size={18} />}
                                    {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                                </button>

                                <button
                                    onClick={handleBuyClick}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Buy Now
                                </button>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '20px' }}>
                                {/* Payment Method Selection */}
                                {isManualPaymentEnabled ? (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>Select Payment Method</h4>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                type="button"
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
                                                type="button"
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
                                ) : (
                                    <div style={{ marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>Payment Method</h4>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            backgroundColor: '#eff6ff',
                                            border: '1.5px solid #bfdbfe',
                                            borderRadius: '8px'
                                        }}>
                                            <CreditCard size={22} color="var(--primary-color)" />
                                            <div>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Online Payment (Razorpay)</span>
                                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>UPI, Cards & NetBanking with Instant Activation</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                {isManualPaymentEnabled && paymentMethod === 'upi' && (
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

            {/* Free Preview PDF Viewer */}
            {previewPdfUrl && (
                <PDFViewer
                    url={previewPdfUrl}
                    onClose={() => setPreviewPdfUrl(null)}
                />
            )}

            {/* Free Preview Video Modal */}
            {previewVideoUrl && (
                <div
                    onClick={() => setPreviewVideoUrl(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#111827',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: '850px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderBottom: '1px solid #374151',
                            color: 'white'
                        }}>
                            <span style={{ fontSize: '15px', fontWeight: '600' }}>Lesson Video Preview</span>
                            <button
                                onClick={() => setPreviewVideoUrl(null)}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '0', backgroundColor: 'black' }}>
                            <video
                                src={previewVideoUrl}
                                controls
                                autoPlay
                                style={{ width: '100%', maxHeight: '70vh', display: 'block' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProductDetail;
