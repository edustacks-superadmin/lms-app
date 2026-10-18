'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Search, Folder, Edit, Trash2, X, Loader2, XCircle, Grid, List as ListIcon } from 'lucide-react';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import AdvancedPagination from './AdvancedPagination';

// Debounce custom hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

const QuestionFolderList = () => {
    const router = useRouter();
    const {
        folders,
        fetchFolders,
        deleteFolder,
        loading,
        page,
        totalPages,
        totalItems,
        limit,
        goToPage,
        searchFolders,
        changeItemsPerPage
    } = useQuestionFolders();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    // Debounce search term to prevent excessive API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Initial fetch
    useEffect(() => {
        fetchFolders();
    }, []);

    // Effect for debounced search
    useEffect(() => {
        searchFolders(debouncedSearchTerm);
    }, [debouncedSearchTerm]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this folder? Questions will remain in the question bank.')) {
            const result = await deleteFolder(id);
            if (result.success) {
                setOpenMenuId(null);
            }
        }
    };

    const handleEdit = (folder, e) => {
        e.stopPropagation();
        setEditingFolder(folder);
        setShowCreateModal(true);
        setOpenMenuId(null);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="flex-1 mt-6 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Question Folders
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Organize and manage your question collections</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search folders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Grid View"
                        >
                            <Grid size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingFolder(null);
                            setShowCreateModal(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={18} />
                        New Folder
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col">
                {loading && folders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading your folders...</p>
                    </div>
                ) : folders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm border-dashed">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                            <Folder size={40} className="text-blue-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No folders found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8">
                            {searchTerm ? `No results found for "${searchTerm}"` : 'Get started by creating your first question folder to organize your content.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Create First Folder
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`
                        ${viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                            : 'bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100'
                        }
                    `}>
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                onClick={() => router.push(`/questions/folders/${folder.id}`)}
                                className={`
                                    group cursor-pointer transition-all
                                    ${viewMode === 'grid'
                                        ? 'bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-full hover:border-blue-300 hover:shadow-md'
                                        : 'p-4 flex items-center justify-between hover:bg-slate-50/80'
                                    }
                                `}
                            >
                                <div className={`flex ${viewMode === 'grid' ? 'flex-col items-start gap-4' : 'items-center gap-4'} flex-1 min-w-0`}>
                                    <div className={`
                                        ${viewMode === 'grid' ? 'w-12 h-12 rounded-xl mb-1' : 'w-10 h-10 rounded-lg'}
                                        bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300
                                    `}>
                                        <Folder size={viewMode === 'grid' ? 24 : 20} fill="currentColor" className="opacity-80" />
                                    </div>

                                    <div className="flex-1 min-w-0 w-full">
                                        <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mb-2' : 'mb-1 gap-3'}`}>
                                            <h3 className="text-base font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                                {folder.name}
                                            </h3>
                                            {viewMode === 'list' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                                    {folder.questionCount || 0} questions
                                                </span>
                                            )}
                                        </div>

                                        {folder.description && (
                                            <p className={`text-sm text-slate-500 ${viewMode === 'grid' ? 'line-clamp-2 mb-4 h-10' : 'line-clamp-1'}`}>
                                                {folder.description}
                                            </p>
                                        )}

                                        {viewMode === 'grid' && (
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 w-full">
                                                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                    {folder.questionCount || 0} questions
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`
                                    relative ${viewMode === 'grid' ? 'absolute top-4 right-4' : 'ml-4'}
                                `} onClick={(e) => e.stopPropagation()}>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                                            }}
                                            className={`p-2 rounded-lg transition-colors ${openMenuId === folder.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {openMenuId === folder.id && (
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 animate-in zoom-in-95 duration-100 py-1 overflow-hidden">
                                                <button
                                                    onClick={(e) => handleEdit(folder, e)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-blue-500"
                                                >
                                                    <Edit size={16} className="text-slate-500" /> Edit Details
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(folder.id, e)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-red-500"
                                                >
                                                    <Trash2 size={16} /> Delete Folder
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Advanced Pagination */}
                {totalPages > 0 && (
                    <div className="mt-8">
                        <AdvancedPagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={limit}
                            onPageChange={goToPage}
                            onItemsPerPageChange={changeItemsPerPage}
                            pageSizeOptions={[10, 20, 50, 100]}
                        />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateFolderModal
                    folder={editingFolder}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingFolder(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingFolder(null);
                        fetchFolders();
                    }}
                />
            )}
        </div>
    );
};

const CreateFolderModal = ({ folder, onClose, onSuccess }) => {
    const { addFolder, updateFolder } = useQuestionFolders();
    const [formData, setFormData] = useState({
        name: folder?.name || '',
        description: folder?.description || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = folder
            ? await updateFolder(folder.id, formData)
            : await addFolder(formData);

        setLoading(false);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {folder ? 'Edit Folder Details' : 'Create New Folder'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {folder ? 'Update your folder information below' : 'Add a new folder to organize questions'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white bg-slate-100/50 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-center gap-3">
                            <XCircle size={20} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">
                                Folder Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., JEE Mains Physics 2024"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">
                                Description <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="Add a brief description about what's inside this folder..."
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-70 disabled:shadow-none"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    folder ? 'Save Changes' : 'Create Folder'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QuestionFolderList;
