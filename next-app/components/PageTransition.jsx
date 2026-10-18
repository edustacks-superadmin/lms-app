'use client';

import React, { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './PageTransition.css';

const PageTransition = ({ children }) => {
    const pathname = usePathname();
    const prevPathRef = useRef(pathname);

    const getOrder = (path) => {
        if (!path) return -1;
        if (path.includes('/student/dashboard')) return 0;
        if (path.includes('/student/courses')) return 1;
        if (path.includes('/student/store')) return 2;
        if (path.includes('/student/ranking')) return 3;
        if (path.includes('/student/profile')) return 4;
        return -1;
    };

    const currentOrder = getOrder(pathname);
    const prevOrder = getOrder(prevPathRef.current);

    let animationClass = '';

    if (currentOrder !== -1 && prevOrder !== -1 && currentOrder !== prevOrder) {
        if (currentOrder > prevOrder) {
            animationClass = 'animate-enter-from-right';
        } else {
            animationClass = 'animate-enter-from-left';
        }
    }

    useEffect(() => {
        prevPathRef.current = pathname;
    }, [pathname]);

    return (
        <div
            key={pathname}
            className={`${animationClass} student-main-content w-full`}
        >
            {children}
        </div>
    );
};

export default PageTransition;
