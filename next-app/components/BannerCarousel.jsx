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
        <div className="home-banner-carousel relative w-full overflow-hidden bg-black">
            {/* Banner Images */}
            {activeBanners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`banner-slide absolute top-0 left-0 w-full h-full transition-opacity duration-500 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url(${banner.image_url})` }}
                >
                    {/* Optional: Add overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />

                    {/* Banner Content */}
                    {banner.title && (
                        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 text-center text-white z-[2] max-w-[90%]">
                            <h2 className="text-5xl font-bold mb-4 drop-shadow-lg">
                                {banner.title}
                            </h2>
                            {banner.link_url && (
                                <a
                                    href={banner.link_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-8 py-3 bg-blue-600 text-white no-underline rounded-lg font-semibold text-base transition-transform duration-200 shadow-lg hover:bg-blue-700 hover:scale-105"
                                >
                                    Learn More
                                </a>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Navigation Arrows (only show if more than 1 banner) */}
            {activeBanners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-5 top-1/2 -translate-y-1/2 z-[3] bg-white/30 border-none rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-sm hover:bg-white/50 hover:scale-110"
                    >
                        <ChevronLeft size={28} color="#fff" />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-5 top-1/2 -translate-y-1/2 z-[3] bg-white/30 border-none rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-sm hover:bg-white/50 hover:scale-110"
                    >
                        <ChevronRight size={28} color="#fff" />
                    </button>
                </>
            )}

            {/* Dot Indicators (only show if more than 1 banner) */}
            {activeBanners.length > 1 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[3] flex gap-2.5">
                    {activeBanners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-3 border-none cursor-pointer transition-all duration-300 shadow rounded-md ${index === currentIndex ? 'w-8 bg-white' : 'w-3 bg-white/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BannerCarousel;
