'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LayoutList, PlusCircle, Tags, MessageSquare, Trash2, Tag as TagIcon, Filter, ChevronDown, ArrowUpDown, RotateCcw } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import MultiSelect from './MultiSelect';
import { useInstitute } from '../context/InstituteContext';
import { useTags } from '../context/TagContext';
import Link from 'next/link';
import { supabase } from '../supabaseClient';

const PostsSidebar = ({ onFilterChange, activeStatus, onStatusChange, isStudent = false }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { institute } = useInstitute();
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest',
        tags: []
    });

    const { tags, fetchTags } = useTags();

    useEffect(() => {
        fetchTags();
    }, []);

    const postTags = useMemo(() => {
        return tags.filter(tag => {
            const types = (tag.type || 'all').split(',');
            return types.includes('all') || types.includes('post');
        }).map(tag => ({
            label: tag.name,
            value: tag.id.toString(),
            color: tag.color
        }));
    }, [tags]);

    useEffect(() => {
        if (institute?.id) {
            fetchCategories();
        }
    }, [institute?.id]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .eq('institute_id', institute.id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        // Auto-apply filters on change
        onFilterChange(newFilters);
    };

    const isActive = (path) => pathname === path;

    const menuItems = [
        { name: 'All Posts', icon: LayoutList, path: '/admin/posts' },
        { name: 'Create Post', icon: PlusCircle, path: '/admin/posts/create' },
        { name: 'Categories', icon: Tags, path: '/admin/posts/categories' },
        { name: 'Comments', icon: MessageSquare, path: '/admin/comments' },

        { isSeparator: true },
        { name: 'Deleted Posts', icon: Trash2, path: '/admin/posts/deleted', isDestructive: true },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Navigation</h3>

                {!isStudent && (
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
                                            : item.isDestructive
                                                ? 'text-slate-600 hover:bg-red-50 hover:text-red-600'
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
                )}

                {/* Filters Section */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <LayoutList size={14} className="text-slate-400" /> Filters
                        </h3>
                        {(filters.status || filters.category || (filters.tags && filters.tags.length > 0) || filters.sortBy !== 'newest') && (
                            <button
                                onClick={() => {
                                    const resetFilters = { status: '', category: '', dateFrom: '', dateTo: '', sortBy: 'newest', tags: [] };
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
                        {!isActive('/admin/posts/deleted') && (
                            <div className="group">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors">
                                    <Filter size={14} /> Status
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer hover:bg-white"
                                        value={filters.status || ''}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="group">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors">
                                <Tags size={14} /> Category
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer hover:bg-white"
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="group">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors">
                                <TagIcon size={14} /> Tags
                            </label>
                            <MultiSelect
                                options={postTags}
                                value={filters.tags || []}
                                onChange={(value) => handleFilterChange('tags', value)}
                                icon={TagIcon}
                            />
                        </div>

                        <div className="group">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 group-hover:text-blue-600 transition-colors">
                                <ArrowUpDown size={14} /> Sort By
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer hover:bg-white"
                                    value={filters.sortBy}
                                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="title_asc">Title A-Z</option>
                                    <option value="title_desc">Title Z-A</option>
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

export default PostsSidebar;
