'use client';

import React, { useEffect, useState } from 'react';

const ReadingProgress = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const currentScroll = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

            if (scrollHeight) {
                setProgress(Number((currentScroll / scrollHeight).toFixed(2)) * 100);
            }
        };

        window.addEventListener('scroll', updateProgress);

        return () => {
            window.removeEventListener('scroll', updateProgress);
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: `${progress}%`,
                height: '4px',
                backgroundColor: '#10b981', // emerald-500
                zIndex: 9999,
                transition: 'width 0.1s ease-out'
            }}
        />
    );
};

export default ReadingProgress;
