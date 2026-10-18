'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { X, LayoutDashboard, BookOpen, ShoppingCart, Trophy, User, LogOut, Sparkles, Shield, Bookmark, BarChart2 } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const MobileSidebar = () => {
    const { isSidebarOpen, closeSidebar } = useSidebar();
    const { signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { isFeatureEnabled } = useFeatureFlags();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const allNavItems = [
        { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/student/courses', icon: BookOpen, label: 'My Courses' },
        { path: '/student/store', icon: ShoppingCart, label: 'Store' },
        { path: '/student/ranking', icon: Trophy, label: 'Ranking', featureFlag: 'leaderboard' },
        { path: '/student/bookmarks', icon: Bookmark, label: 'Bookmarks', featureFlag: 'bookmarks' },
        { path: '/student/analytics', icon: BarChart2, label: 'Analytics' },
        { path: '/student/chat', icon: Sparkles, label: 'AI Chat', featureFlag: 'aiChat' },
        { path: '/student/login-activity', icon: Shield, label: 'Login Activity' },
        { path: '/student/profile', icon: User, label: 'Profile' }
    ];

    const navItems = allNavItems.filter(item =>
        !item.featureFlag || isFeatureEnabled(item.featureFlag)
    );

    if (!isSidebarOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                onClick={closeSidebar}
                className="fixed inset-0 bg-black/50 z-[999] animate-fade-in"
            />

            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-screen w-[280px] bg-white z-[1000] shadow-lg flex flex-col animate-slide-in-left">
                {/* Header */}
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 m-0">
                        Menu
                    </h2>
                    <button
                        onClick={closeSidebar}
                        className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={closeSidebar}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-lg no-underline text-[15px] mb-1 transition-all ${isActive
                                        ? 'text-[var(--primary-color)] bg-blue-50 font-semibold'
                                        : 'text-gray-600 bg-transparent font-medium hover:bg-gray-100'
                                    }`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            closeSidebar();
                            handleLogout();
                        }}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-lg w-full bg-transparent border-none text-red-500 font-medium text-[15px] cursor-pointer hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-in-out;
                }
                @keyframes slideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-left {
                    animation: slideInLeft 0.3s ease-in-out;
                }
            `}</style>
        </>
    );
};

export default MobileSidebar;
