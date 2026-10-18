'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tag, GripVertical, Package, Search, Edit2, Eye, Trash2, Check, X, MoreHorizontal, ChevronRight, FileText, Plus } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import ProductStats from './ProductStats';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

const ProductCard = ({ product, dragHandleProps, isDragging, isSelected, onToggleSelect, onToggleStatus }) => {
    const router = useRouter();

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
            className={`
                group relative bg-white border rounded-2xl overflow-hidden transition-all duration-300
                ${isDragging ? 'opacity-50 shadow-none scale-95 border-blue-400' : 'hover:shadow-xl hover:border-blue-100 border-slate-200 shadow-sm'}
                ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : ''}
            `}
        >
            {/* Selection Checkbox */}
            <div className={`absolute top-3 left-3 z-30 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(product.id);
                    }}
                    className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                />
            </div>

            {/* Drag Handle */}
            {dragHandleProps && !isSelected && (
                <div
                    {...dragHandleProps}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    className="absolute top-3 left-10 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-white text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                >
                    <GripVertical size={16} />
                </div>
            )}

            {/* Status Quick Toggle */}
            <div className={`absolute top-3 right-3 z-30 flex items-center gap-2 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(product.id);
                    }}
                    className={`
                        p-2 rounded-lg backdrop-blur-md shadow-sm border transition-all hover:scale-110 active:scale-90
                        ${product.status === 'approved'
                            ? 'bg-emerald-50/90 text-emerald-600 border-emerald-100'
                            : 'bg-slate-50/90 text-slate-400 border-slate-100'}
                    `}
                    title={product.status === 'approved' ? 'Unapprove Product' : 'Approve Product'}
                >
                    {product.status === 'approved' ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                </button>
            </div>

            {/* Image Area */}
            <div
                className="aspect-[16/10] w-full bg-slate-50 flex items-center justify-center overflow-hidden relative group-hover:bg-slate-100/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/store/product/${product.id}`)}
            >
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Package size={40} strokeWidth={1.5} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Asset</span>
                    </div>
                )}

                {/* Discount Badge */}
                {discountObj.hasDiscount && (
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-500 text-white text-[10px] font-black rounded-lg shadow-lg uppercase tracking-tighter">
                        {discountObj.pct}% OFF
                    </div>
                )}

                {/* Hover Overlay Action */}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/store/edit/${product.id}`); }}
                            className="p-2.5 bg-white text-slate-900 rounded-xl shadow-xl hover:bg-blue-600 hover:text-white transition-colors"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button className="p-2.5 bg-white text-slate-900 rounded-xl shadow-xl hover:bg-emerald-600 hover:text-white transition-colors">
                            <Eye size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors flex-1" title={product.title}>
                        {product.title}
                    </h3>
                </div>

                {product.short_description ? (
                    <p className="text-xs text-slate-500 line-clamp-2 h-8 mb-4 leading-relaxed">
                        {product.short_description}
                    </p>
                ) : (
                    <div className="h-8 mb-4" />
                )}

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            ₹{product.price || '0'}
                        </span>
                        {discountObj.hasDiscount && (
                            <span className="text-xs text-slate-400 line-through font-medium">
                                ₹{product.strikethrough_price}
                            </span>
                        )}
                    </div>
                    {product.product_tags && product.product_tags.length > 0 && (
                        <div className="flex -space-x-2">
                            {product.product_tags.slice(0, 3).map((tag, idx) => (
                                <div
                                    key={tag.id}
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: tag.color }}
                                    title={tag.name}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SortableProduct = ({ product, isSelected, onToggleSelect, onToggleStatus }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="h-full">
            <ProductCard
                product={product}
                dragHandleProps={{ ...attributes, ...listeners }}
                isDragging={isDragging}
                isSelected={isSelected}
                onToggleSelect={onToggleSelect}
                onToggleStatus={onToggleStatus}
            />
        </div>
    );
};

const ProductList = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryFilter = searchParams.get('category');
    const statusFilter = searchParams.get('status') || 'approved';
    const tagsFilter = searchParams.get('tags');
    const { products, fetchProducts, updateProductOrder, toggleProductStatus, bulkUpdateProducts, loading } = useProducts();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = products.findIndex((p) => p.id === active.id);
            const newIndex = products.findIndex((p) => p.id === over.id);
            const reorderedProducts = arrayMove(products, oldIndex, newIndex);
            await updateProductOrder(reorderedProducts);
        }
    };

    // Filter Logic
    const filteredProducts = products.filter(product => {
        // 1. Category Filter
        if (categoryFilter && product.category_id !== parseInt(categoryFilter)) return false;

        // 2. Status Filter
        const productStatus = product.status || 'approved';
        if (productStatus !== statusFilter) return false;

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

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkStatusChange = async (status) => {
        if (selectedIds.length === 0) return;
        await bulkUpdateProducts(selectedIds, { status });
        setSelectedIds([]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Set ${selectedIds.length} products to Inactive?`)) {
            await bulkUpdateProducts(selectedIds, { status: 'inactive' });
            setSelectedIds([]);
        }
    };

    const getStatusLabel = () => {
        const statusLabels = {
            draft: 'Drafts',
            pending: 'Pending Approval',
            approved: 'Approved Products',
            inactive: 'Inactive Products'
        };
        return statusLabels[statusFilter] || 'Products';
    };

    const isDragEnabled = !categoryFilter && statusFilter === 'approved' && !searchQuery;

    return (
        <div className="flex-1 w-full max-w-[1600px] mx-auto pb-32">
            {/* Stats Overview */}
            <ProductStats />

            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6 w-full lg:w-auto">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {getStatusLabel()}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {filteredProducts.length} Results
                            </span>
                            {selectedIds.length > 0 && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                                        {selectedIds.length} Selected
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {/* Select All Toggle */}
                    <button
                        onClick={toggleSelectAll}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedIds.length === filteredProducts.length && filteredProducts.length > 0
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <Check size={16} /> : null}
                        {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>

                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-80 group flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                            />
                        </div>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest p-2"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:ml-2">
                        <button
                            onClick={() => router.push('/store/categories')}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                            title="Manage Categories"
                        >
                            <Tag size={20} />
                        </button>

                        <button
                            onClick={() => router.push('/store/create')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <Plus size={18} />
                            <span>Create</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 border-r border-slate-700 pr-8">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-bold tracking-tight">Products Selected</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {statusFilter !== 'approved' && (
                            <button
                                onClick={() => handleBulkStatusChange('approved')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-colors"
                            >
                                <Check size={14} /> Approve Selected
                            </button>
                        )}
                        {statusFilter !== 'draft' && (
                            <button
                                onClick={() => handleBulkStatusChange('draft')}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors"
                            >
                                <FileText size={14} /> Mark as Draft
                            </button>
                        )}
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-600/30"
                        >
                            <Trash2 size={14} /> Deactivate
                        </button>

                        <div className="w-px h-8 bg-slate-700 mx-2" />

                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest px-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-[16/14] bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {filteredProducts.length > 0 ? (
                        isDragEnabled ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={filteredProducts.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                        {filteredProducts.map((product) => (
                                            <SortableProduct
                                                key={product.id}
                                                product={product}
                                                isSelected={selectedIds.includes(product.id)}
                                                onToggleSelect={toggleSelect}
                                                onToggleStatus={toggleProductStatus}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        isSelected={selectedIds.includes(product.id)}
                                        onToggleSelect={toggleSelect}
                                        onToggleStatus={toggleProductStatus}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-200 rounded-3xl">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Search size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">No matching products</h3>
                            <p className="text-slate-400 text-sm max-w-xs text-center mb-8 font-medium">
                                {searchQuery
                                    ? `We couldn't find any products matching "${searchQuery}"`
                                    : categoryFilter
                                        ? "This category currently has no products assigned to it."
                                        : "Start building your catalog by creating a new package."}
                            </p>
                            {(searchQuery || categoryFilter || statusFilter !== 'approved') && (
                                <button
                                    onClick={() => { setSearchQuery(''); router.push('/store'); }}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                    Clear all filters <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductList;
