'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, BookOpen, ShoppingCart, LayoutDashboard, Trophy, Menu } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useSidebar } from '../context/SidebarContext';
import { useCart } from '../context/CartContext';

const StudentHeader = () => {
    const { institute } = useInstitute();
    const { signOut, user: authUser } = useAuth();
    const { toggleSidebar } = useSidebar();
    const { cartCount } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState(null);

    const isActive = (path) => pathname === path;

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                if (authUser?.email === 'student@demo.com') {
                    setCurrentUser({
                        name: authUser.user_metadata?.full_name || 'Demo Student',
                        email: authUser.email,
                        photo: null
                    });
                    return;
                }

                if (authUser) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('*')
                        .eq('email', authUser.email)
                        .single();

                    if (member) {
                        setCurrentUser({
                            name: member.display_name || 'Student',
                            email: member.email,
                            photo: member.photo_url
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, [authUser]);

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <header className="student-header">
            <div className="flex items-center justify-between h-full w-full px-10">
                {/* Logo and Institute Name */}
                <div className="flex items-center gap-3">
                    <button
                        className="mobile-menu-btn bg-transparent border-none cursor-pointer text-[var(--text-color)] mr-2 p-2 relative z-10"
                        onClick={toggleSidebar}
                    >
                        <Menu size={24} />
                    </button>
                    <Link href="/student/dashboard" className="flex items-center gap-2 no-underline text-inherit">
                        {institute?.logo_url ? (
                            <img
                                src={institute.logo_url}
                                alt="Logo"
                                width={40}
                                height={40}
                                style={{ width: '40px', height: '40px' }}
                                className="w-10 h-10 object-contain"
                            />
                        ) : institute?.name ? (
                            <div className="w-10 h-10 border-2 border-gray-800 flex items-center justify-center font-bold text-xl">
                                {institute.name.substring(0, 2).toUpperCase()}
                            </div>
                        ) : null}
                        <div className="flex flex-col leading-none">
                            <span className="font-black text-sm tracking-wider">
                                {institute?.name?.toUpperCase() || ''}
                            </span>
                            <span className="text-[8px] font-bold tracking-wide mt-1">
                                {institute?.slogan?.toUpperCase() || ''}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="desktop-nav-links flex items-center gap-2">
                    <Link
                        href="/student/dashboard"
                        className={`flex items-center gap-2 py-2 px-4 rounded-md no-underline font-medium text-sm transition-all ${isActive('/student/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-transparent hover:bg-gray-100'
                            }`}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Link>

                    <Link
                        href="/student/courses"
                        className={`flex items-center gap-2 py-2 px-4 rounded-md no-underline font-medium text-sm transition-all ${isActive('/student/courses') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-transparent hover:bg-gray-100'
                            }`}
                    >
                        <BookOpen size={18} />
                        My Courses
                    </Link>

                    <Link
                        href="/student/store"
                        className={`flex items-center gap-2 py-2 px-4 rounded-md no-underline font-medium text-sm transition-all ${isActive('/student/store') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-transparent hover:bg-gray-100'
                            }`}
                    >
                        <ShoppingCart size={18} />
                        Store
                    </Link>

                    <Link
                        href="/student/ranking"
                        className={`flex items-center gap-2 py-2 px-4 rounded-md no-underline font-medium text-sm transition-all ${isActive('/student/ranking') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-transparent hover:bg-gray-100'
                            }`}
                    >
                        <Trophy size={18} />
                        Ranking
                    </Link>

                    <Link
                        href="/resources"
                        className={`flex items-center gap-2 py-2 px-4 rounded-md no-underline font-medium text-sm transition-all ${isActive('/resources') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-transparent hover:bg-gray-100'
                            }`}
                    >
                        <BookOpen size={18} />
                        Free Resources
                    </Link>
                </div>

                {/* User Profile Section */}
                <div className="desktop-profile-section flex items-center gap-4">
                    {/* Cart Icon */}
                    <button
                        onClick={() => router.push('/student/cart')}
                        className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all relative group"
                    >
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in duration-200">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    <span className="font-semibold text-sm text-[var(--text-color)] ml-2">
                        {currentUser?.name || 'Student'}
                    </span>

                    {/* Profile Container */}
                    <div
                        className="relative cursor-pointer"
                        onClick={() => router.push('/student/profile')}
                        title="View Profile"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded overflow-hidden bg-gray-800">
                                {currentUser?.photo ? (
                                    <img
                                        src={currentUser.photo}
                                        alt={currentUser.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                        {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="bg-transparent border-none cursor-pointer text-[var(--text-light)] flex items-center p-1 hover:text-gray-700"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StudentHeader;
