'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function CartRedirectPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (user) {
            // User is logged in, redirect to student cart
            router.replace('/student/cart');
        } else {
            // User is not logged in, redirect to login
            router.replace('/login?redirect=/student/cart');
        }
    }, [user, loading, router]);

    // Show loading spinner while checking auth
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );
}
