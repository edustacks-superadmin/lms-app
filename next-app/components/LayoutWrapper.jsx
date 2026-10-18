'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import PublicHeader from './PublicHeader';
import FloatingSocials from './FloatingSocials';
import AnnouncementBar from './AnnouncementBar';
import MobileBottomNav from './MobileBottomNav';

// ... (existing imports)

// ...

import PublicFooter from './PublicFooter';
import ScrollToTop from './ScrollToTop';
import { useAuth } from '../context/AuthContext';

const LayoutWrapper = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { role, loading } = useAuth();

    // Define route patterns
    const isPublicRoute =
        pathname === '/' ||
        pathname === '/home' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/partner') ||
        pathname.startsWith('/posts') ||
        pathname.startsWith('/store') ||
        pathname === '/about-us' ||
        pathname === '/faq' ||
        pathname === '/instructors' ||
        pathname === '/careers' ||
        pathname === '/affiliate-program' ||
        pathname === '/signup' ||
        pathname === '/student/signup' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password' ||
        pathname === '/privacy-policy' ||
        pathname === '/terms-and-conditions' ||
        pathname === '/terms' ||
        pathname === '/shipping-policy' ||
        pathname === '/refund-policy' ||
        pathname.startsWith('/achievers') ||
        pathname.startsWith('/results') ||
        pathname.startsWith('/resources') ||
        pathname.startsWith('/gallery') ||
        pathname === '/contact-us' ||
        pathname === '/student/tnpsc-ae-analysis' ||
        pathname === '/student/tnpsc_diploma_iti_analysis' ||
        pathname === '/cart';

    const isStudentRoute = pathname.startsWith('/student');
    const isPrintPage = pathname?.endsWith('/print');

    // Print Page: No header or footer
    if (isPrintPage) {
        return <>{children}</>;
    }

    // Public Routes: PublicHeader + PublicFooter
    if (isPublicRoute) {
        return (
            <>
                <AnnouncementBar />
                <PublicHeader />
                <main className="min-h-[calc(100vh-200px)] w-full">
                    {children}
                </main>
                <PublicFooter />
                <FloatingSocials />
                <ScrollToTop />
                <MobileBottomNav />
            </>
        );
    }

    // Student Routes
    if (isStudentRoute) {
        return <>{children}</>;
    }

    // Admin Routes (Explicit /admin path)
    const isAdminRoute = pathname.startsWith('/admin');

    if (isAdminRoute) {
        return <>{children}</>;
    }

    // Default: Admin App Routes (e.g. /courses, /exams)
    // PROTECT: Only show if admin
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (role !== 'admin') {
        // Not authorized for these routes
        // Render Public Header so they aren't lost, and a 404/Access Denied
        return (
            <>
                <PublicHeader />
                <main className="min-h-[calc(100vh-200px)] w-full flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 max-w-md">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                        <p className="text-gray-600 mb-6">Page not found or you do not have permission to view it.</p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Go Home
                        </button>
                    </div>
                </main>
                <PublicFooter />
            </>
        );
    }

    // If Admin, show Admin Header + Content
    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-80px)] bg-gray-100 p-0 w-full">
                {children}
            </main>
        </>
    );
};

export default LayoutWrapper;
