'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import StudentHeader from './StudentHeader';

const ProtectedLayout = ({ children, allowedRoles = [] }) => {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
                if (role === 'student') {
                    router.push('/student/dashboard');
                } else {
                    router.push('/login');
                }
            }
        }
    }, [user, role, loading, allowedRoles, router]);


    if (loading || !user || (allowedRoles.length > 0 && role && !allowedRoles.includes(role))) {
        return (
            <div className="flex items-center justify-center min-h-screen text-lg text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <div className="app-container">
            {role === 'student' ? <StudentHeader /> : <Header />}
            <div className="main-content">
                {children}
            </div>
        </div>
    );
};

export default ProtectedLayout;
