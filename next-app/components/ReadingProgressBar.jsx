'use client';

import React, { useState, useEffect } from 'react';

const ReadingProgressBar = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const currentScroll = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

            if (scrollHeight) {
                setProgress(Number((currentScroll / scrollHeight).toFixed(3)) * 100);
            }
        };

        window.addEventListener('scroll', updateProgress);
        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    return (
        <div className="fixed top-[64px] left-0 w-full h-1 z-30 pointer-events-none">
            <div
                className="h-full bg-blue-600 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};

export default ReadingProgressBar;
