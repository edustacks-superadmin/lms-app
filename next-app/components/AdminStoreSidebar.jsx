'use client';

import React, { useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Tag, Plus, Users, Package } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useProductCategories } from '../context/ProductCategoryContext';
import { useTags } from '../context/TagContext';
import MultiSelect from './MultiSelect';

const AdminStoreSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { categories, fetchCategories } = useProductCategories();
    const { tags, fetchTags } = useTags();
    const currentCategory = searchParams?.get('category') || '';
    const currentStatus = searchParams?.get('status') || '';
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
        router.push(`/admin/store?${newParams.toString()}`);
    };

    const menuItems = [
        { name: 'All Products', icon: Package, status: '', path: '/admin/store' },
        { name: 'Drafts', icon: FileText, status: 'draft' },
        { name: 'Pending Approval', icon: Clock, status: 'pending' },
        { name: 'Approved', icon: CheckCircle, status: 'approved' },
        { name: 'Inactive', icon: XCircle, status: 'inactive' },
        { isSeparator: true },
        { name: 'Categories', icon: Tag, path: '/admin/store/categories' },
        { name: 'Coupons', icon: Tag, path: '/admin/store/coupons' },
        { name: 'Influencer Reports', icon: Users, path: '/admin/marketing/influencers' },
    ];

    const handleStatusClick = (status) => {
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        if (status) {
            newParams.set('status', status);
        } else {
            newParams.delete('status');
        }

        if (currentCategory) {
            newParams.set('category', currentCategory);
        }
        if (currentTags.length > 0) {
            newParams.set('tags', currentTags.join(','));
        }
        router.push(`/admin/store?${newParams.toString()}`);
    };

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
        router.push(`/admin/store?${newParams.toString()}`);
    };

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                {/* Create Button */}
                <button
                    onClick={() => router.push('/admin/store/create')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 text-sm font-medium mb-6"
                >
                    <Plus size={18} />
                    Create Package
                </button>

                {/* Navigation */}
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Management</h3>
                <div className="space-y-1 mb-8">
                    {menuItems.map((item, index) => {
                        if (item.isSeparator) {
                            return <div key={index} className="h-px bg-slate-100 my-3" />;
                        }

                        const Icon = item.icon;
                        const isPathActive = item.path ? pathname === item.path : false;
                        const isStatusActive = item.status && currentStatus === item.status;
                        const isActive = isPathActive || isStatusActive;

                        if (item.path && !item.status) {
                            // Direct Link
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={item.name}
                                onClick={() => handleStatusClick(item.status)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                            >
                                <Icon size={18} />
                                <span>{item.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filters Section */}
                <div className="flex items-center justify-between mb-4 mt-6">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</h3>
                    {(currentCategory || currentTags.length > 0 || currentStatus) && (
                        <button
                            onClick={() => {
                                router.push('/admin/store');
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

export default AdminStoreSidebar;
