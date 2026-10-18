'use client';

import React, { useState } from 'react';
import { LayoutList, PlusCircle, FileText, Filter, RotateCcw, Settings, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useInstitute } from '../context/InstituteContext';

const ResourcesSidebar = ({ onFilterChange }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { institute } = useInstitute();
    const [filters, setFilters] = useState({
        category: '',
        search: ''
    });

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const isActive = (path) => pathname === path;

    const menuItems = [
        { name: 'All Posts', icon: LayoutList, path: '/admin/posts' },
        { isSeparator: true },
        { name: 'All Resources', icon: FileText, path: '/admin/resources' },
        { name: 'Add Resource', icon: PlusCircle, path: '/admin/resources/create' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Navigation</h3>

                <div className="space-y-1">
                    {menuItems.map((item, index) => {
                        if (item.isSeparator) {
                            return <div key={index} className="h-px bg-slate-100 my-3" />;
                        }

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

                    {/* Settings Button (Opens Modal) */}
                    <button
                        onClick={() => router.push('/admin/resources?settings=open')}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900
                        `}
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>

                {/* Filters Section */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <LayoutList size={14} className="text-slate-400" /> Filters
                        </h3>
                        {(filters.category || filters.search) && (
                            <button
                                onClick={() => {
                                    const resetFilters = { category: '', search: '' };
                                    setFilters(resetFilters);
                                    onFilterChange(resetFilters);
                                }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md"
                            >
                                <RotateCcw size={10} /> Reset
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="group">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors">
                                <Filter size={14} /> Category
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer hover:bg-white"
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    <option value="Syllabus">Syllabus</option>
                                    <option value="Previous Year Papers">Previous Year Papers</option>
                                    <option value="Notification">Notification</option>
                                    <option value="Other">Other</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ResourcesSidebar;
