'use client';

import React from 'react';
import { LayoutList, PlusCircle, Image, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GallerySidebar = () => {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    const menuItems = [
        { name: 'All Items', icon: LayoutList, path: '/admin/gallery' },
        { name: 'Add Item', icon: PlusCircle, path: '/admin/gallery/create' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Gallery Management</h3>

                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                                    ${active
                                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                            >
                                <Icon size={18} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};

export default GallerySidebar;
