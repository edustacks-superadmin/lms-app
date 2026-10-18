'use client';

import React from 'react';
import StudentLayout from '../../components/StudentLayout';
import { usePathname } from 'next/navigation';

export default function Layout({ children }) {
    const pathname = usePathname();

    // Signup page and Exam Take page should not use the standard Student Layout (no header/sidebar)
    if (pathname === '/student/signup' || pathname.includes('/take') || pathname === '/student/tnpsc-ae-analysis' || pathname === '/student/tnpsc_diploma_iti_analysis') {
        return <>{children}</>;
    }

    return (
        <StudentLayout>
            {children}
        </StudentLayout>
    );
}
