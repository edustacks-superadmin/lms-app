'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { useProducts } from '../context/ProductContext';
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import BannerCarousel from '../components/BannerCarousel';
import TestimonialsSection from '../components/TestimonialsSection';
import LiveStats from '../components/LiveStats';
import PartnerLogos from '../components/PartnerLogos';
import { HomePageStructuredData } from '../components/StructuredData';
import CallToAction from '../components/CallToAction';

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
            {/* Structured Data for SEO */}
            <HomePageStructuredData />

            {/* Hero Section */}
            <section className="relative bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 py-6 lg:py-10">
                    <div className="flex flex-col-reverse lg:flex-row items-center gap-8">
                        {/* Text Content */}
                        <div className="flex-1 text-center lg:text-left z-10 w-full">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-4 tracking-tight">
                                {settings?.hero_title || 'Welcome to Edustacks'}
                            </h1>
                            <p className="text-base md:text-lg text-slate-600 mb-6 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                {settings?.hero_subtitle || 'Empowering Students, One Course at a Time. Start learning from the best instructors today.'}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                                <button
                                    onClick={() => {
                                        const element = document.getElementById('products');
                                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm md:text-base"
                                >
                                    {settings?.hero_cta_text || 'Explore Courses'}
                                    <ArrowRight size={18} />
                                </button>

                                {settings?.signup_link_text && (
                                    <button
                                        onClick={() => router.push('/student/signup')}
                                        className="w-full sm:w-auto px-6 py-3.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm md:text-base"
                                    >
                                        {settings.signup_link_text}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Hero Image */}
                        {settings?.hero_banner_image && (
                            <div className="flex-1 w-full flex justify-center lg:justify-end">
                                <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-xl border border-white ring-1 ring-slate-100/50 bg-white transform hover:scale-[1.01] transition-transform duration-500">
                                    <img
                                        src={settings.hero_banner_image}
                                        alt={settings.hero_title || "Hero Banner"}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                                </div>
                                {/* Subtle decorative elements */}
                                <div className="absolute -z-10 top-0 right-0 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl mix-blend-multiply" />
                                <div className="absolute -z-10 bottom-0 left-10 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl mix-blend-multiply" />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Live Stats Section */}
            {settings?.show_live_stats && settings?.live_stats_config?.stats && (
                <LiveStats stats={settings.live_stats_config.stats} />
            )}

            {/* Banners Carousel (if active) */}
            {
                banners.length > 0 && (
                    <div className="py-4 bg-slate-50">
                        <BannerCarousel banners={banners} />
                    </div>
                )
            }

            {/* Testimonials Section */}
            <TestimonialsSection />

            {/* Partner Logos */}
            <PartnerLogos />

            {/* Products Section */}
            {
                settings?.show_products && (
                    <section id="products" className="py-12 px-6 bg-slate-50">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center mb-10">
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

                                                <h3 className="text-xl font-bold mb-3 text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                                                    {product.title}
                                                </h3>
                                                {product.short_description && (
                                                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">
                                                        {product.short_description}
                                                    </p>
                                                )}

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
                                <div className="text-center mt-10">
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
                )
            }

            {/* Call to Action Section */}
            <CallToAction />
        </div >
    );
};

export default HomePage;
