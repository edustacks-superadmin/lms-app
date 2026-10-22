import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { useProducts } from '../context/ProductContext';
import { ArrowRight, ShoppingCart, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import BannerCarousel from './BannerCarousel';
import TestimonialsSection from './TestimonialsSection';

const HomePage = () => {
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useHomeSettings(); // For hero banner
    const { institute } = useInstitute(); // For branding (not actively used here, but could be)
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
        // Redirect to login with a return URL
        navigate(`/login?redirect=/student/store/product/${productId}`);
    };

    const displayProducts = settings?.show_products
        ? products.slice(0, settings?.products_to_display || 6)
        : [];

    if (settingsLoading || bannersLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Hero Section - Use Banner Carousel if banners exist, otherwise show default hero */}
            {banners.length > 0 ? (
                <BannerCarousel banners={banners} />
            ) : (
                <section style={{
                    position: 'relative',
                    backgroundColor: '#f3f4f6',
                    minHeight: '650px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: settings?.hero_banner_image ? `url(${settings.hero_banner_image})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}>
                    {/* Overlay */}
                    {settings?.hero_banner_image && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }} />
                    )}

                    {/* Hero Content */}
                    <div style={{
                        position: 'relative',
                        maxWidth: '1200px',
                        width: '100%',
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: settings?.hero_banner_image ? 'white' : '#1a1a1a'
                    }}>
                        <h1 style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            marginBottom: '24px',
                            lineHeight: '1.2'
                        }}>
                            {settings?.hero_title || (institute?.name ? `Welcome to ${institute.name}` : '')}
                        </h1>
                        <p style={{
                            fontSize: '20px',
                            marginBottom: '32px',
                            opacity: 0.9,
                            maxWidth: '700px',
                            margin: '0 auto 32px'
                        }}>
                            {settings?.hero_subtitle || 'Empowering Students, One Course at a Time'}
                        </p>
                        <button
                            onClick={() => {
                                const element = document.getElementById('products');
                                if (element) element.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                                padding: '14px 32px',
                                fontSize: '16px',
                                fontWeight: '600',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {settings?.hero_cta_text || 'Explore Courses'}
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </section>
            )}

            {/* Testimonials Section */}
            <TestimonialsSection />

            {/* Products Section */}
            {settings?.show_products && (
                <section id="products" style={{
                    backgroundColor: '#f9fafb',
                    padding: '60px 20px'
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                            <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '12px' }}>
                                Our Courses
                            </h2>
                            <p style={{ fontSize: '16px', color: '#6b7280' }}>
                                Browse our collection of popular courses
                            </p>
                        </div>

                        {productsLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                Loading courses...
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                No courses available at the moment.
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '24px'
                            }}>
                                {displayProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            border: '1px solid #e5e7eb',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {/* Product Image */}
                                        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                                    <ShoppingCart size={32} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Content */}
                                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <h3 style={{
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                marginBottom: '8px',
                                                color: '#1a1a1a',
                                                lineHeight: '1.4'
                                            }}>
                                                {product.title}
                                            </h3>
                                            <p style={{
                                                fontSize: '14px',
                                                color: '#6b7280',
                                                marginBottom: '16px',
                                                flex: 1
                                            }}>
                                                {product.short_description}
                                            </p>

                                            {/* Price and Action */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                                <div>
                                                    {product.strikethrough_price && (
                                                        <span style={{ fontSize: '14px', color: '#9ca3af', textDecoration: 'line-through', marginRight: '8px' }}>
                                                            ₹{product.strikethrough_price}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' }}>
                                                        {product.price > 0 ? `₹${product.price}` : 'Free'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleEnrollClick(product.id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: 'var(--primary-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        fontSize: '14px'
                                                    }}
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
                            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        padding: '12px 24px',
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        backgroundColor: 'transparent',
                                        color: 'var(--primary-color)',
                                        border: '2px solid var(--primary-color)',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Login to View All Courses
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
