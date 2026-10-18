'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ShoppingBag, User, BookOpen, Menu, Trophy } from 'lucide-react';
import { useHomeSettings } from '../context/HomeSettingsContext';

const MobileBottomNav = () => {
    const pathname = usePathname();
    const { settings } = useHomeSettings();

    // Don't show on admin routes or if explicitly disabled
    if (settings?.mobile_bottom_nav_enabled === false) {
        return null;
    }

    // Determine if we are in the student area
    const isStudentArea = pathname.startsWith('/student');

    const navItems = isStudentArea
        ? [
            { href: '/student/dashboard', icon: Home, label: 'Dashboard' },
            { href: '/student/courses', icon: BookOpen, label: 'Courses' },
            { href: '/student/store', icon: ShoppingBag, label: 'Store' },
            { href: '/student/ranking', icon: Trophy, label: 'Ranking' },
            { href: '/student/profile', icon: User, label: 'Profile' },
        ]
        : [
            { href: '/', icon: Home, label: 'Home' },
            { href: '/store', icon: ShoppingBag, label: 'Store' },
            { href: '/resources', icon: BookOpen, label: 'Resources' },
            { href: '/login', icon: User, label: 'Login' },
        ];

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Spacer to prevent content from being hidden behind nav */}
            <div className="h-16 md:hidden" />

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-200 shadow-lg safe-area-pb">
                <div className="flex items-center justify-around h-16">
                    {navItems.map(({ href, icon: Icon, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors ${isActive(href)
                                ? 'text-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive(href) ? 2.5 : 2}
                                className="mb-1"
                            />
                            <span className={`text-[10px] leading-none ${isActive(href) ? 'font-semibold' : 'font-medium'
                                }`}>
                                {label}
                            </span>
                            {isActive(href) && (
                                <div className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
};

export default MobileBottomNav;
