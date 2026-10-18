'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Plus, Tag, FolderOpen } from 'lucide-react';
import { useProductCategories } from '../context/ProductCategoryContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ProductCategories = () => {
    const router = useRouter();
    const { categories, fetchCategories, deleteCategory, loading } = useProductCategories();
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDeleteClick = (category) => {
        setDeleteModal({ isOpen: true, category });
        setOpenMenuId(null);
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.category) {
            await deleteCategory(deleteModal.category.id);
            setDeleteModal({ isOpen: false, category: null });
        }
    };

    return (
        <div className="flex-1 w-full max-w-5xl mx-auto mt-6 px-4 sm:px-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/store')}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Product Categories
                        </h1>
                        <p className="text-sm text-slate-500">Manage categories for your store items</p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/admin/store/categories/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Create Category</span>
                </button>
            </div>

            {/* Categories List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                    {categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FolderOpen size={32} className="text-slate-300" />
                            </div>
                            <p className="font-medium text-lg text-slate-700">No categories found</p>
                            <p className="text-sm mb-4">Create your first category to organize products.</p>
                        </div>
                    ) : (
                        categories.map((category) => (
                            <div
                                key={category.id}
                                className="flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500"
                                        style={{ color: category.color || '#64748b', backgroundColor: category.color ? `${category.color}15` : '#f1f5f9' }}
                                    >
                                        <Tag size={20} />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-semibold text-slate-900"
                                            style={{ color: category.color || 'inherit' }}
                                        >
                                            {category.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {category.productCount || 0} Products
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {openMenuId === category.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setOpenMenuId(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <button
                                                    onClick={() => router.push(`/admin/store/categories/edit/${category.id}`)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(category)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Category"
                message="Are you sure you want to delete this category? All products in this category will need to be reassigned."
                itemName={deleteModal.category?.name}
                confirmText="Delete Category"
            />
        </div>
    );
};

export default ProductCategories;
