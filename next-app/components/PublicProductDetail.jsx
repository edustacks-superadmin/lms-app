'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock,
    Calendar,
    Award,
    BookOpen,
    Share2,
    ShoppingCart,
    ChevronDown,
    ChevronRight,
    Lock,
    Unlock,
    FileText,
    Video,
    CheckCircle,
    PlayCircle,
    File as FileIcon
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const PublicProductDetail = ({ productId }) => {
    const router = useRouter();
    const { getProductById, loading: productLoading } = useProducts();
    const { user } = useAuth();
    const { addToCart } = useCart();
    const { showToast } = useToast();

    const [product, setProduct] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedCourses, setExpandedCourses] = useState({});

    useEffect(() => {
        const loadProduct = async () => {
            const result = await getProductById(productId);
            if (result.success) {
                setProduct(result.data);
            }
        };
        loadProduct();
    }, [productId]);

    useEffect(() => {
        const loadCurriculum = async () => {
            if (activeTab === 'curriculum' && courses.length === 0) {
                setLoadingCourses(true);
                try {
                    const res = await fetch(`/api/store/products/${productId}/curriculum`);
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setCourses(data);
                        // Default expand the first course
                        if (data.length > 0) {
                            setExpandedCourses({ [data[0].id]: true });
                        }
                    }
                } catch (err) {
                    console.error('Failed to load curriculum', err);
                } finally {
                    setLoadingCourses(false);
                }
            }
        };
        loadCurriculum();
    }, [activeTab, productId, courses.length]);

    const toggleCourse = (courseId) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const handleBuyNow = () => {
        // Implement purchase logic
        if (!user) {
            router.push(`/login?redirect=/store/product/${productId}`);
            return;
        }
        // Redirect to checkout or handle purchase
        router.push(`/checkout?productId=${productId}`);
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'video': return <PlayCircle size={16} className="text-blue-500" />;
            case 'pdf': return <FileText size={16} className="text-red-500" />;
            case 'exam': return <CheckCircle size={16} className="text-emerald-500" />;
            default: return <FileIcon size={16} className="text-slate-400" />;
        }
    };

    if (productLoading || !product) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Content (8 columns) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Header Section (Mobile only - visible on small screens) */}
                    <div className="lg:hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">{product.title}</h1>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                            {product.start_date && (
                                <span className="flex items-center gap-1"><Calendar size={14} /> Starts {new Date(product.start_date).toLocaleDateString()}</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900">₹{product.price}</span>
                                {product.strikethrough_price && (
                                    <span className="text-sm text-slate-400 line-through">₹{product.strikethrough_price}</span>
                                )}
                            </div>
                            <button
                                onClick={handleBuyNow}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                Buy Now
                            </button>
                            <button
                                onClick={() => {
                                    addToCart(product).then(res => {
                                        if (res.success) {
                                            showToast(res.message, 'success');
                                        } else {
                                            showToast(res.message, 'error');
                                        }
                                    });
                                }}
                                className="p-2 border border-slate-200 rounded-lg text-slate-700"
                            >
                                <ShoppingCart size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Banner Image */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative group">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.title}
                                className="w-full aspect-video object-cover"
                            />
                        ) : (
                            <div className="w-full aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <BookOpen size={64} className="text-white/20" />
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 py-4 text-sm font-semibold text-center transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('curriculum')}
                            className={`flex-1 py-4 text-sm font-semibold text-center transition-colors border-b-2 ${activeTab === 'curriculum' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            Course Curriculum
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-[400px]">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-4">Description</h2>
                                    <div
                                        className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: product.description || product.short_description || 'No description available.' }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">Start Date</h3>
                                            <p className="text-sm text-slate-500 mt-1">{product.start_date ? new Date(product.start_date).toLocaleDateString() : 'Accessible Immediately'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">Validity</h3>
                                            <p className="text-sm text-slate-500 mt-1">{product.validity_type === 'period' ? 'Runs until end date' : `${product.validity} Days`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CURRICULUM TAB */}
                        {activeTab === 'curriculum' && (
                            <div className="animate-in fade-in duration-300">
                                {loadingCourses ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : courses.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                                        <p>No curriculum content available yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Course Content</h2>
                                            <span className="text-sm text-slate-500">{courses.length} Courses included</span>
                                        </div>

                                        {courses.map(course => (
                                            <div key={course.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                                {/* Course Header */}
                                                <button
                                                    onClick={() => toggleCourse(course.id)}
                                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`transition-transform duration-200 ${expandedCourses[course.id] ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}>
                                                            <ChevronRight size={20} />
                                                        </div>
                                                        <span className="font-semibold text-slate-800">{course.title}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                                                        {course.chapters?.length || 0} Chapters
                                                    </span>
                                                </button>

                                                {/* Chapters List */}
                                                {expandedCourses[course.id] && (
                                                    <div className="border-t border-slate-200">
                                                        {course.chapters?.length === 0 ? (
                                                            <div className="p-4 text-sm text-slate-400 italic pl-12">No chapters yet.</div>
                                                        ) : (
                                                            <div className="divide-y divide-slate-100">
                                                                {course.chapters.map(chapter => (
                                                                    <div key={chapter.id} className="bg-white">
                                                                        {/* Chapter Header (Nested) */}
                                                                        {/* Render only if not root chapter or render root chapter as clickable row */}
                                                                        <button
                                                                            onClick={() => toggleChapter(chapter.id)}
                                                                            className="w-full flex items-center justify-between p-3 pl-8 hover:bg-slate-50 text-left group"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`transition-transform duration-200 ${expandedChapters[chapter.id] ? 'rotate-90 text-slate-600' : 'text-slate-400'}`}>
                                                                                    <ChevronRight size={16} />
                                                                                </div>
                                                                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{chapter.name}</span>
                                                                            </div>
                                                                        </button>

                                                                        {/* Contents List */}
                                                                        {expandedChapters[chapter.id] && (
                                                                            <div className="bg-slate-50/50 pl-14 pr-4 py-2 space-y-1">
                                                                                {chapter.chapter_contents?.length === 0 ? (
                                                                                    <div className="text-xs text-slate-400 py-1 italic">Empty chapter</div>
                                                                                ) : (
                                                                                    chapter.chapter_contents.map(content => (
                                                                                        <div key={content.id} className="flex items-center justify-between py-2 group">
                                                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                                                <div className="shrink-0">
                                                                                                    {getIconForType(content.type)}
                                                                                                </div>
                                                                                                <span className="text-sm text-slate-600 truncate group-hover:text-slate-900 transition-colors">{content.title}</span>
                                                                                            </div>
                                                                                            <div className="shrink-0 ml-4">
                                                                                                {content.free_preview ? (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            if (!user) {
                                                                                                                const returnUrl = encodeURIComponent(window.location.pathname);
                                                                                                                router.push(`/login?redirect=${returnUrl}`);
                                                                                                            } else {
                                                                                                                window.open(content.url || '#', '_blank');
                                                                                                            }
                                                                                                        }}
                                                                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                                                                                    >
                                                                                                        Preview
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
                                                                                                        <Lock size={12} />
                                                                                                        <span>Buy to Unlock</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sticky Purchase Card (4 columns) */}
                <div className="lg:col-span-4">
                    <div className="sticky top-24 space-y-6">
                        {/* Purchase Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transform transition-all hover:shadow-xl">
                            <div className="p-6 md:p-8">
                                <h1 className="text-xl font-bold text-slate-900 mb-2 leading-tight hidden lg:block">{product.title}</h1>

                                <div className="mt-6 flex items-baseline gap-3 mb-6">
                                    <span className="text-4xl font-bold text-slate-900">₹{product.price}</span>
                                    {product.strikethrough_price && (
                                        <span className="text-lg text-slate-400 line-through">₹{product.strikethrough_price}</span>
                                    )}
                                </div>

                                <button
                                    onClick={handleBuyNow}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-blue-200 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
                                >
                                    <span>Buy Now</span>
                                    <ShoppingCart size={20} />
                                </button>

                                <button
                                    onClick={() => {
                                        addToCart(product).then(res => {
                                            if (res.success) {
                                                showToast(res.message, 'success');
                                            } else {
                                                showToast(res.message, 'error');
                                            }
                                        });
                                    }}
                                    className="w-full bg-white border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-700 py-3.5 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
                                >
                                    <span>Add to Cart</span>
                                    <ShoppingCart size={20} />
                                </button>

                                <p className="text-xs text-center text-slate-400">Secure transaction • Instant access</p>
                            </div>

                        </div>

                        {/* Share / Support */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    const btn = document.getElementById('share-btn-text');
                                    if (btn) btn.innerText = 'Copied!';
                                    setTimeout(() => {
                                        if (btn) btn.innerText = 'Share';
                                    }, 2000);
                                }}
                                className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Share2 size={16} /> <span id="share-btn-text">Share</span>
                            </button>
                            {/* <button className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                Contact Support
                            </button> */}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PublicProductDetail;
