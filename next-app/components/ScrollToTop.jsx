'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Toggle visibility based on scroll
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    // Scroll to top smoothly
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-[9999] p-3 rounded-full bg-[var(--primary-color)] text-white shadow-lg hover:opacity-90 transition-all transform hover:scale-110 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-300"
                    title="Back to Top"
                    aria-label="Scroll to top"
                    style={{
                        backgroundColor: 'var(--primary-color, #2563eb)' // Fallback blue
                    }}
                >
                    <ArrowUp size={24} strokeWidth={2.5} />
                </button>
            )}
        </>
    );
};

export default ScrollToTop;
