'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { useProducts } from '../context/ProductContext';
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import BannerCarousel from './BannerCarousel';
import TestimonialsSection from './TestimonialsSection';

const HomePage = () => {
    const router = useRouter();
    const { settings, loading: settingsLoading } = useHomeSettings();
    const { institute } = useInstitute();
    const { products, fetchProducts, loading: productsLoading } = useProducts();
    const [banners, setBanners] = useState([]);
    const [bannersLoading, setBannersLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const { data, error } = await supabase
                .from('banner_ads')
                .select('*')
                .eq('status', 'Active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners(data || []);
        } catch (error) {
            console.error('Error fetching banners:', error);
        } finally {
            setBannersLoading(false);
        }
    };

    const handleEnrollClick = (productId) => {
        router.push(`/login?redirect=/student/store/product/${productId}`);
    };

    const displayProducts = useMemo(() => {
        return settings?.show_products
            ? products.slice(0, settings?.products_to_display || 6)
            : [];
    }, [settings, products]);

    if (settingsLoading || bannersLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Hero Section */}
            {banners.length > 0 ? (
                <BannerCarousel banners={banners} />
            ) : (
                <section
                    className="relative bg-slate-900 min-h-[600px] flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-hidden"
                    style={{
                        backgroundImage: settings?.hero_banner_image ? `url(${settings.hero_banner_image})` : 'none'
                    }}
                >
                    {/* Overlay */}
                    <div className={`absolute inset-0 ${settings?.hero_banner_image ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'}`} />

                    {/* Hero Content */}
                    <div className="relative max-w-7xl w-full py-20 px-6 text-center z-10">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight text-white tracking-tight drop-shadow-lg">
                            {settings?.hero_title || 'Welcome to Edustacks'}
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto mb-12 font-medium leading-relaxed drop-shadow-md">
                            {settings?.hero_subtitle || 'Empowering Students, One Course at a Time'}
                        </p>
                        <button
                            onClick={() => {
                                const element = document.getElementById('products');
                                if (element) element.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 px-10 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-blue-600/30 flex items-center gap-3 mx-auto"
                        >
                            {settings?.hero_cta_text || 'Explore Courses'}
                            <ArrowRight size={22} />
                        </button>
                    </div>
                </section>
            )}

            {/* Testimonials Section */}
            <TestimonialsSection />

            {/* Products Section */}
            {settings?.show_products && (
                <section id="products" className="py-24 px-6 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <span className="text-blue-600 font-bold tracking-wider uppercase text-sm bg-blue-50 px-3 py-1 rounded-full mb-4 inline-block border border-blue-100">Featured Content</span>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                                Our Popular Courses
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Explore our highest-rated courses designed to help you master new skills and advance your career.
                            </p>
                        </div>

                        {productsLoading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-slate-500 font-medium">Loading courses...</p>
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                    <ShoppingCart size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No Courses Found</h3>
                                <p className="text-slate-500">Check back later for new content.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {displayProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleEnrollClick(product.id)}
                                        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 group cursor-pointer flex flex-col h-full"
                                    >
                                        {/* Product Image */}
                                        <div className="relative aspect-video overflow-hidden bg-slate-100">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                    <ShoppingCart size={48} strokeWidth={1.5} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                                <span className="text-white font-bold flex items-center gap-2">View Details <ArrowRight size={16} /></span>
                                            </div>
                                        </div>

                                        {/* Product Content */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Course</div>
                                                {/* Placeholder rating if real rating not avail */}
                                                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded">
                                                    <Star size={12} fill="currentColor" /> 4.8
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold mb-3 text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                                                {product.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">
                                                {product.short_description || "Master this subject with our comprehensive curriculum designed by industry experts."}
                                            </p>

                                            {/* Price and Action */}
                                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-100">
                                                <div className="flex flex-col">
                                                    {product.strikethrough_price && (
                                                        <span className="text-xs text-slate-400 line-through font-medium">
                                                            ₹{product.strikethrough_price}
                                                        </span>
                                                    )}
                                                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                                        {product.price > 0 ? `₹${product.price}` : 'Free'}
                                                    </span>
                                                </div>
                                                <button
                                                    className="py-2.5 px-5 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-md group-hover:shadow-blue-500/30"
                                                >
                                                    Enroll Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* View All Button */}
                        {displayProducts.length > 0 && (
                            <div className="text-center mt-16">
                                <button
                                    onClick={() => router.push('/login')}
                                    className="py-4 px-10 text-base font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2"
                                >
                                    Login to View All Courses <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default HomePage;
