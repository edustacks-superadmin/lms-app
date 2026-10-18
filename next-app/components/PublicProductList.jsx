'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tag, Package, Search, Eye, ShoppingCart, Star, Filter, RotateCcw, RefreshCw } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';
import { useTags } from '../context/TagContext';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import MultiSelect from './MultiSelect';

const PublicProductCard = ({ product }) => {
    const router = useRouter();
    const { addToCart } = useCart();
    const { showToast } = useToast();

    // Calculate discount %
    const discountObj = React.useMemo(() => {
        if (product.strikethrough_price && product.price && Number(product.strikethrough_price) > Number(product.price)) {
            const pct = Math.round(((Number(product.strikethrough_price) - Number(product.price)) / Number(product.strikethrough_price)) * 100);
            return { hasDiscount: true, pct };
        }
        return { hasDiscount: false, pct: 0 };
    }, [product.price, product.strikethrough_price]);

    return (
        <div
            className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-blue-200 flex flex-col h-full cursor-pointer"
            onClick={() => router.push(`/store/product/${product.id}`)}
        >
            {/* Image Area */}
            <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <Package size={40} strokeWidth={1.5} />
                    </div>
                )}

                {/* Status Badge - Removed for public view */}
                {/* {!product.is_active && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase z-10 border border-amber-200">
                        Inactive
                    </div>
                )} */}

                {/* Discount Badge */}
                {discountObj.hasDiscount && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-[10px] font-black rounded-lg shadow-lg uppercase tracking-tighter z-10">
                        {discountObj.pct}% OFF
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                        <Eye size={16} /> View Details
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {product.title}
                </h3>

                {product.short_description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {product.short_description}
                    </p>
                )}

                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                        {discountObj.hasDiscount && (
                            <span className="text-xs text-slate-400 line-through font-medium">
                                ₹{product.strikethrough_price}
                            </span>
                        )}
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            ₹{product.price || '0'}
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product).then(res => {
                                if (res.success) {
                                    showToast(res.message, 'success');
                                } else {
                                    showToast(res.message, 'error');
                                }
                            });
                        }}
                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200 group-hover:shadow-blue-200"
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublicProductList = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryFilter = searchParams.get('category') || '';
    const tagsFilter = searchParams.get('tags');

    // Contexts
    const { products, fetchProducts, loading } = useProducts();
    const { categories, fetchCategories } = useProductCategories();
    const { tags, fetchTags } = useTags();

    // Local State
    const [searchQuery, setSearchQuery] = useState('');
    const currentTags = React.useMemo(() => tagsFilter ? tagsFilter.split(',').filter(Boolean) : [], [tagsFilter]);

    useEffect(() => {
        // Initial Fetch
        fetchProducts();
        fetchCategories();
        fetchTags();
    }, []);

    // Memoized Tag Options
    const productTags = React.useMemo(() => {
        const type = 'product';
        return tags.filter(tag => {
            const tagTypes = (tag.type || 'all').split(',');
            return tagTypes.includes('all') || tagTypes.includes(type);
        }).map(t => ({ label: t.name, value: t.id.toString(), color: t.color }));
    }, [tags]);

    // Handlers


    const handleTagsChange = (selectedValues) => {
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        if (selectedValues.length > 0) {
            newParams.set('tags', selectedValues.join(','));
        } else {
            newParams.delete('tags');
        }
        router.push(`?${newParams.toString()}`);
    };

    const handleReset = () => {
        router.push('?');
        setSearchQuery('');
    };

    // Filter Logic
    const filteredProducts = products.filter(product => {
        // 1. Show ONLY active products
        if (!product.is_active) return false;

        // 2. Category Filter (supports comma-separated IDs)
        if (categoryFilter) {
            const selectedCategoryIds = categoryFilter.split(',').map(id => parseInt(id.trim()));
            if (product.category_id && !selectedCategoryIds.includes(product.category_id)) return false;
            // Also handle products without category if categories are required? 
            // For now, if filtered by category, product MUST have one of them.
            if (!product.category_id) return false;
        }

        // 3. Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!product.title?.toLowerCase().includes(query) &&
                !product.short_description?.toLowerCase().includes(query)) {
                return false;
            }
        }

        // 4. Tags Filter
        if (tagsFilter) {
            const selectedTagIds = tagsFilter.split(',');
            const hasTag = product.product_tags && product.product_tags.some(pt =>
                selectedTagIds.includes(pt.id.toString())
            );
            if (!hasTag) return false;
        }

        return true;
    });

    return (
        <div className="flex-1 w-full max-w-[1600px] mx-auto pb-32">
            {/* Filters Header */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        All Courses
                        <span className="text-sm font-medium text-slate-400 font-normal bg-slate-100 px-2 py-1 rounded-md">
                            {filteredProducts.length} Results
                        </span>
                        <button
                            onClick={() => {
                                fetchProducts();
                                fetchCategories();
                                fetchTags();
                            }}
                            disabled={loading}
                            className={`p-2 rounded-lg transition-all ${loading ? 'text-blue-400 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="Refresh Courses"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </h2>

                    {(categoryFilter || currentTags.length > 0 || searchQuery) && (
                        <button
                            onClick={handleReset}
                            className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-2 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <RotateCcw size={14} />
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Category Filter */}
                    <div className="md:col-span-3">
                        <div className="md:col-span-3">
                            <MultiSelect
                                options={categories.map(cat => ({
                                    label: `${cat.name} (${cat.productCount})`,
                                    value: cat.id.toString()
                                }))}
                                value={categoryFilter ? categoryFilter.split(',').filter(Boolean) : []}
                                onChange={(selectedValues) => {
                                    const newParams = new URLSearchParams(searchParams?.toString() || '');
                                    if (selectedValues.length > 0) {
                                        newParams.set('category', selectedValues.join(','));
                                    } else {
                                        newParams.delete('category');
                                    }
                                    router.push(`?${newParams.toString()}`);
                                }}
                                placeholder="Filter by categories..."
                                icon={Filter}
                                className="bg-white"
                            />
                        </div>
                    </div>

                    {/* Tags Filter */}
                    <div className="md:col-span-4">
                        <MultiSelect
                            options={productTags}
                            value={currentTags}
                            onChange={handleTagsChange}
                            placeholder="Filter by tags..."
                            icon={Tag}
                            className="bg-white"
                        />
                    </div>

                    {/* Search Bar */}
                    <div className="md:col-span-5">
                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-[16/14] bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map((product) => (
                                <PublicProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No courses found</h3>
                            <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PublicProductList;
