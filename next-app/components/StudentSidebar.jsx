'use client';

import React from 'react';
import { User, LogOut, Bookmark, BarChart2, MessageSquare, X, Sparkles, Shield, LayoutDashboard, BookOpen, ShoppingCart, Trophy, Users } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const StudentSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { signOut } = useAuth();
    const { isSidebarOpen, closeSidebar } = useSidebar();
    const { isFeatureEnabled } = useFeatureFlags();

    // Check feature flag for analytics
    const showAnalytics = isFeatureEnabled('studentAnalytics');

    const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

    const getButtonClass = (path) => {
        const base = 'flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors';
        return isActive(path)
            ? `${base} bg-[var(--primary-color)] text-white`
            : `${base} text-gray-600 bg-transparent hover:bg-gray-100`;
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const handleNavigate = (path) => {
        router.push(path);
        closeSidebar();
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            <aside className={`student-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="mobile-close-btn">
                    <button onClick={closeSidebar} className="bg-transparent border-none cursor-pointer text-gray-500 p-2">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col gap-1 flex-1 overflow-y-auto p-4">

                    {/* Main Navigation */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2 pt-2 pb-1 mb-1">
                            Main Menu
                        </p>
                        <button
                            className={getButtonClass('/student/dashboard')}
                            onClick={() => handleNavigate('/student/dashboard')}
                        >
                            <LayoutDashboard size={18} /> Dashboard
                        </button>
                        <button
                            className={getButtonClass('/student/courses')}
                            onClick={() => handleNavigate('/student/courses')}
                        >
                            <BookOpen size={18} /> My Courses
                        </button>
                        <button
                            className={getButtonClass('/student/store')}
                            onClick={() => handleNavigate('/student/store')}
                        >
                            <ShoppingCart size={18} /> Store
                        </button>
                        <button
                            className={getButtonClass('/student/cart')}
                            onClick={() => handleNavigate('/student/cart')}
                        >
                            <ShoppingCart size={18} /> Cart
                        </button>
                        {isFeatureEnabled('leaderboard') && (
                            <button
                                className={getButtonClass('/student/ranking')}
                                onClick={() => handleNavigate('/student/ranking')}
                            >
                                <Trophy size={18} /> Ranking
                            </button>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 my-2" />

                    {/* Secondary Navigation */}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2 pt-2 pb-1 mb-1">
                        More
                    </p>
                    {isFeatureEnabled('bookmarks') && (
                        <button
                            className={getButtonClass('/student/bookmarks')}
                            onClick={() => handleNavigate('/student/bookmarks')}
                        >
                            <Bookmark size={18} /> Bookmarks
                        </button>
                    )}

                    {showAnalytics && (
                        <button
                            className={getButtonClass('/student/analytics')}
                            onClick={() => handleNavigate('/student/analytics')}
                        >
                            <BarChart2 size={18} /> Analytics
                        </button>
                    )}

                    <button
                        className={getButtonClass('/student/profile')}
                        onClick={() => handleNavigate('/student/profile')}
                    >
                        <User size={18} /> Profile
                    </button>

                    <button
                        className={getButtonClass('/student/posts')}
                        onClick={() => handleNavigate('/student/posts')}
                    >
                        <MessageSquare size={18} /> Posts
                    </button>

                    {isFeatureEnabled('discussionForum') && (
                        <button
                            className={getButtonClass('/student/forum')}
                            onClick={() => handleNavigate('/student/forum')}
                        >
                            <Users size={18} /> Community
                        </button>
                    )}

                    {isFeatureEnabled('aiChat') && (
                        <button
                            className={getButtonClass('/student/chat')}
                            onClick={() => handleNavigate('/student/chat')}
                        >
                            <Sparkles size={18} /> AI Chat
                        </button>
                    )}

                    <button
                        className={getButtonClass('/student/login-activity')}
                        onClick={() => handleNavigate('/student/login-activity')}
                    >
                        <Shield size={18} /> Login Activity
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 my-2" />

                    <button
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors text-red-500 bg-transparent hover:bg-red-50"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default StudentSidebar;
