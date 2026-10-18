'use client';

import React, { useState, useMemo } from 'react';
import {
    PlusCircle, Search, Edit2, Trash2, Star,
    LayoutGrid, List as ListIcon, MoreVertical,
    Folder, FileText, AlertCircle, X, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCategories } from '../context/CategoryContext';
import { useInstitute } from '../context/InstituteContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Simple Modal Component
const CategoryModal = ({ isOpen, onClose, onSave, initialData, title }) => {
    const [formData, setFormData] = useState({
        name: '',
        color: '#3b82f6',
        isStarred: false,
        forForum: false
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || '',
                color: initialData.color || '#3b82f6',
                isStarred: initialData.isStarred || false,
                forForum: initialData.for_forum || false
            });
        } else if (isOpen) {
            setFormData({ name: '', color: '#3b82f6', isStarred: false, forForum: false });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Technology, Exams"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color Tag</label>
                        <div className="flex gap-3 items-center">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="h-10 w-20 rounded cursor-pointer"
                            />
                            <div className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-2 rounded border border-gray-200 uppercase">
                                {formData.color}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, isStarred: !prev.isStarred }))}
                            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2
                                ${formData.isStarred
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Star size={16} className={formData.isStarred ? "fill-amber-500 text-amber-500" : ""} />
                            {formData.isStarred ? 'Starred' : 'Star Category'}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(formData)}
                        disabled={!formData.name.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {title === 'Create Category' ? <PlusCircle size={16} /> : <Check size={16} />}
                        Save Category
                    </button>
                </div>
            </div>
        </div>
    );
};

const PostCategories = () => {
    const router = useRouter();
    const { categories, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategories();
    const { institute } = useInstitute();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: 'create', data: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

    React.useEffect(() => {
        if (institute?.id) {
            fetchCategories(institute.id);
        }
    }, [institute?.id]);

    // Stats Logic
    const stats = useMemo(() => {
        const total = categories.length;
        const totalPosts = categories.reduce((acc, cat) => acc + (cat.count || 0), 0);
        const mostActive = [...categories].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
        const starred = categories.filter(c => c.isStarred).length;
        return { total, totalPosts, mostActive, starred };
    }, [categories]);

    // Filter Logic
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;
        const lowerQ = searchQuery.toLowerCase();
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(lowerQ)
        );
    }, [categories, searchQuery]);

    const handleSave = async (data) => {
        if (modalConfig.mode === 'create') {
            await addCategory(data);
        } else {
            await updateCategory(modalConfig.data.id, data);
        }
        setModalConfig({ isOpen: false, mode: 'create', data: null });
    };

    const handleDeleteClick = (id, name) => {
        setDeleteModal({ isOpen: true, id, name });
    };

    const handleConfirmDelete = async () => {
        if (deleteModal.id) {
            await deleteCategory(deleteModal.id);
            setDeleteModal({ isOpen: false, id: null, name: '' });
        }
    };

    return (
        <div className="flex-1 space-y-6">

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Categories</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Folder size={20} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Posts</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalPosts}</p>
                    </div>
                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
                        <FileText size={20} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Active</p>
                        <p className="text-lg font-bold text-slate-900 mt-1 truncate" title={stats.mostActive?.name || '-'}>
                            {stats.mostActive ? stats.mostActive.name : '-'}
                        </p>
                        {stats.mostActive && (
                            <p className="text-xs text-slate-500">{stats.mostActive.count} posts</p>
                        )}
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                        <Star size={20} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starred</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.starred}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                        <Star size={20} className="fill-current" />
                    </div>
                </div>
            </div>

            {/* Main Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => setModalConfig({ isOpen: true, mode: 'create', data: null })}
                        className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm shadow-blue-200 flex-1 md:flex-none justify-center"
                    >
                        <PlusCircle size={18} />
                        <span className="hidden sm:inline">New Category</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* Categories Content */}
            {filteredCategories.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <Folder size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg">No categories found</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-6">Create a new category to get started organizing your content.</p>
                    <button
                        onClick={() => setModalConfig({ isOpen: true, mode: 'create', data: null })}
                        className="text-blue-600 font-semibold hover:text-blue-700 text-sm"
                    >
                        + Create First Category
                    </button>
                </div>
            ) : (
                <div className={
                    viewMode === 'grid'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        : "flex flex-col space-y-2 bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100"
                }>
                    {filteredCategories.map((category) => (
                        viewMode === 'grid' ? (
                            // Grid Card
                            <div key={category.id} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                {/* Color Stripe */}
                                <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: category.color }} />

                                <div className="flex justify-between items-start mb-4 pl-2">
                                    <h3 className="font-bold text-slate-800 text-lg truncate pr-2 w-full" title={category.name}>{category.name}</h3>
                                    {category.isStarred && <Star size={16} className="text-amber-400 fill-amber-400 shrink-0 mt-1" />}
                                </div>

                                <div className="pl-2 mb-2">
                                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                                        <FileText size={12} />
                                        {category.count || 0} posts
                                    </div>
                                </div>

                                <div className="pl-2 flex items-center justify-end gap-2 border-t border-slate-50 pt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                    <button
                                        onClick={() => setModalConfig({ isOpen: true, mode: 'edit', data: category })}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(category.id, category.name)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Always visible mobile actions */}
                                <div className="absolute bottom-3 right-3 flex md:hidden gap-2">
                                    <button
                                        onClick={() => setModalConfig({ isOpen: true, mode: 'edit', data: category })}
                                        className="p-2 text-slate-400 hover:text-blue-600"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // List Item
                            <div key={category.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">{category.name}</span>
                                            {category.isStarred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                                        </div>
                                        < span className="text-xs text-slate-400">{category.count || 0} posts</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setModalConfig({ isOpen: true, mode: 'edit', data: category })}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                        <span className="sr-only">Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(category.id, category.name)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span className="sr-only">Delete</span>
                                    </button>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Modal */}
            <CategoryModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSave={handleSave}
                initialData={modalConfig.data}
                title={modalConfig.mode === 'create' ? 'Create Category' : 'Edit Category'}
            />

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone."
                itemName={deleteModal.name}
            />
        </div>
    );
};

export default PostCategories;
