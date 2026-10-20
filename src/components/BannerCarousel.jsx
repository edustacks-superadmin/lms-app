import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerCarousel = ({ banners }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Filter only active banners
    const activeBanners = banners.filter(banner => banner.status === 'Active');

    // Auto-rotate banners every 5 seconds
    useEffect(() => {
        if (activeBanners.length <= 1) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, [currentIndex, activeBanners.length]);

    const nextSlide = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const prevSlide = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    const goToSlide = (index) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 500);
    };

    if (!activeBanners || activeBanners.length === 0) {
        // Fallback to default hero section if no banners
        return null;
    }

    const currentBanner = activeBanners[currentIndex];

    return (
        <div
            className="home-banner-carousel"
            style={{
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                backgroundColor: '#000'
            }}>
            {/* Banner Images */}
            {activeBanners.map((banner, index) => {
                const shouldHideTitle = Boolean(banner.hide_title);
                return (
                    <div
                        key={banner.id}
                        className="banner-slide"
                        onClick={() => {
                            if (shouldHideTitle && banner.link_url) {
                                window.open(banner.link_url, '_blank');
                            }
                        }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: index === currentIndex ? 1 : 0,
                            transition: 'opacity 0.5s ease-in-out',
                            backgroundImage: `url(${banner.image_url})`,
                            cursor: shouldHideTitle && banner.link_url ? 'pointer' : 'default'
                        }}
                    >
                        {/* Optional: Add overlay for better text readability only when title is visible */}
                        {!shouldHideTitle && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))'
                            }} />
                        )}

                        {/* Banner Content (Only if title is not hidden) */}
                        {!shouldHideTitle && banner.title && (
                            <div style={{
                                position: 'absolute',
                                bottom: '60px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                textAlign: 'center',
                                color: 'white',
                                zIndex: 2,
                                maxWidth: '90%'
                            }}>
                                <h2 style={{
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    marginBottom: '16px',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    {banner.title}
                                </h2>
                                {banner.link_url && (
                                    <a
                                        href={banner.link_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-block',
                                            padding: '12px 32px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            textDecoration: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            fontSize: '16px',
                                            transition: 'transform 0.2s',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        Learn More
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Navigation Arrows (only show if more than 1 banner) */}
            {activeBanners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backdropFilter: 'blur(4px)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        }}
                    >
                        <ChevronLeft size={28} color="#fff" />
                    </button>

                    <button
                        onClick={nextSlide}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backdropFilter: 'blur(4px)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        }}
                    >
                        <ChevronRight size={28} color="#fff" />
                    </button>
                </>
            )}

            {/* Dot Indicators (only show if more than 1 banner) */}
            {activeBanners.length > 1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                    display: 'flex',
                    gap: '10px'
                }}>
                    {activeBanners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            style={{
                                width: index === currentIndex ? '32px' : '12px',
                                height: '12px',
                                borderRadius: '6px',
                                backgroundColor: index === currentIndex ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                        />
                    ))}
                </div>
            )}

            <style>{`
                .home-banner-carousel {
                    height: 500px;
                }
                .banner-slide {
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                }
                @media (max-width: 768px) {
                    .home-banner-carousel {
                        height: 350px;
                    }
                    .banner-slide h2 {
                        font-size: 32px !important;
                    }
                }
                @media (max-width: 480px) {
                    .home-banner-carousel {
                        height: 250px;
                    }
                    .banner-slide h2 {
                        font-size: 24px !important;
                        margin-bottom: 8px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default BannerCarousel;
