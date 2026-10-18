'use client';

import React, { useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Tag, Plus, Users, Package } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useProductCategories } from '../context/ProductCategoryContext';
import { useTags } from '../context/TagContext';
import MultiSelect from './MultiSelect';

const StoreSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { categories, fetchCategories } = useProductCategories();
    const { tags, fetchTags } = useTags();
    const currentCategory = searchParams?.get('category') || '';
    const currentStatus = searchParams?.get('status') || 'approved';
    const currentTags = searchParams?.get('tags') ? searchParams.get('tags').split(',').filter(Boolean) : [];

    useEffect(() => {
        fetchCategories();
        fetchTags();
    }, []);

    const handleCategoryChange = (e) => {
        const categoryId = e.target.value;
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        if (categoryId) {
            newParams.set('category', categoryId);
        } else {
            newParams.delete('category');
        }
        router.push(`/store?${newParams.toString()}`);
    };

    const menuItems = [
        // Public store typically just shows products. Categories are the main filter.
        // We can keep 'All Products' if we treat it as status reset.
    ];

    const productTags = React.useMemo(() => {
        const type = 'product';
        return tags.filter(tag => {
            const tagTypes = (tag.type || 'all').split(',');
            return tagTypes.includes('all') || tagTypes.includes(type);
        }).map(t => ({ label: t.name, value: t.id.toString(), color: t.color }));
    }, [tags]);

    const handleTagsChange = (selectedValues) => {
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        if (selectedValues.length > 0) {
            newParams.set('tags', selectedValues.join(','));
        } else {
            newParams.delete('tags');
        }
        router.push(`/store?${newParams.toString()}`);
    };

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">

                {/* Filters Section */}
                <div className="flex items-center justify-between mb-4 mt-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</h3>
                    {(currentCategory || currentTags.length > 0) && (
                        <button
                            onClick={() => {
                                router.push('/store');
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                        <select
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            value={currentCategory}
                            onChange={handleCategoryChange}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name} ({cat.productCount})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <MultiSelect
                            label="Tags"
                            options={productTags}
                            value={currentTags}
                            onChange={handleTagsChange}
                            placeholder="Filter by tags..."
                            icon={Tag}
                        />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default StoreSidebar;
