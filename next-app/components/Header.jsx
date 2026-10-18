'use client';

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, FileText, Users, PenTool, BarChart2, Bell, User, MessageSquare, Wrench, LogOut, BookOpen, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const Header = () => {
    const { institute } = useInstitute();
    const { signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const navigate = (path) => router.push(path);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMembershipsOpen, setIsMembershipsOpen] = useState(false);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && institute?.id) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('*')
                        .eq('email', user.email)
                        .eq('institute_id', institute.id)
                        .single();

                    if (member) {
                        setCurrentUser({
                            name: member.display_name || 'User',
                            email: member.email,
                            photo: member.photo_url,
                            role: member.role
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, [institute?.id]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const getLinkClasses = (path) => {
        const isActive = pathname === path || (path !== '/admin' && pathname.startsWith(path));
        return `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`;
    };

    const isMembershipsActive = pathname.startsWith('/members') || pathname.startsWith('/batches');

    return (
        <header className="h-20 bg-white border-b border-slate-200 sticky top-0 z-[100]">
            <div className="h-full w-full px-10 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 text-slate-900 no-underline">
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
                            <div className="w-10 h-10 border-2 border-slate-800 flex items-center justify-center font-bold text-xl rounded">
                                {institute.name.substring(0, 2).toUpperCase()}
                            </div>
                        ) : null}
                        <div className="flex flex-col leading-none">
                            <span className="font-black text-sm tracking-wider">
                                {institute?.name?.toUpperCase() || ''}
                            </span>
                            <span className="text-[8px] font-bold tracking-widest text-slate-500">
                                {institute?.slogan?.toUpperCase() || ''}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex items-center gap-2">
                    <Link href="/admin" className={getLinkClasses('/admin')}>
                        <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link href="/courses" className={getLinkClasses('/courses')}>
                        <FileText size={18} /> Courses
                    </Link>
                    <Link href="/exams" className={getLinkClasses('/exams')}>
                        <PenTool size={18} /> Exams
                    </Link>
                    <Link href="/questions" className={getLinkClasses('/questions')}>
                        <FileText size={18} /> Questions
                    </Link>

                    <div
                        className="relative group"
                        onMouseEnter={() => setIsStoreOpen(true)}
                        onMouseLeave={() => setIsStoreOpen(false)}
                    >
                        <Link href="/admin/store" className={getLinkClasses('/admin/store')}>
                            <ShoppingCart size={18} /> Store <span className="text-[10px]">▼</span>
                        </Link>
                        {isStoreOpen && (
                            <div className="absolute top-full left-0 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-2 mt-1 animate-in fade-in zoom-in-95 duration-100">
                                <Link
                                    href="/admin/store"
                                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    Products
                                </Link>
                                <Link
                                    href="/admin/store/coupons"
                                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    Coupons
                                </Link>
                                <Link
                                    href="/store/categories"
                                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    Categories
                                </Link>
                            </div>
                        )}
                    </div>
                    <div
                        className="relative group"
                        onMouseEnter={() => setIsMembershipsOpen(true)}
                        onMouseLeave={() => setIsMembershipsOpen(false)}
                    >
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${isMembershipsActive
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Users size={18} /> Memberships <span className="text-[10px]">▼</span>
                        </div>

                        {isMembershipsOpen && (
                            <div className="absolute top-full left-0 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-2 mt-1 animate-in fade-in zoom-in-95 duration-100">
                                <Link href="/members" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                    Members Management
                                </Link>
                                <Link href="/batches" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                    Batch Management
                                </Link>
                                <Link href="/admin/roles" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                    Roles Management
                                </Link>
                            </div>
                        )}
                    </div>
                    <Link href="/admin/posts" className={getLinkClasses('/admin/posts')}>
                        <PenTool size={18} /> Posts
                    </Link>

                </nav>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    {/* Profile Dropdown Container */}
                    <div
                        className="relative"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                                {currentUser?.photo ? (
                                    <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    currentUser?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <div className="font-medium text-sm text-slate-700 leading-tight">{currentUser?.name || 'User'}</div>
                                {currentUser?.role && (
                                    <div className="text-[10px] text-slate-500 capitalize leading-none mt-0.5">
                                        {currentUser.role}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400">▼</span>
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <div className="text-xs text-slate-500">Signed in as</div>
                                        <div className="font-semibold text-sm text-slate-900 mt-0.5 truncate">{currentUser?.name || 'User'}</div>
                                        <div className="text-xs text-slate-400 mt-0.5 truncate">{currentUser?.email}</div>
                                    </div>

                                    <div className="py-1">
                                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                            <MessageSquare size={16} className="text-slate-400" /> Comments
                                        </a>
                                        <Link href="/settings/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                            <Wrench size={16} className="text-slate-400" /> Settings
                                        </Link>
                                    </div>

                                    <div className="border-t border-slate-100 py-1">
                                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors">
                                            <LogOut size={16} /> Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </header>
    );
};

export default Header;
