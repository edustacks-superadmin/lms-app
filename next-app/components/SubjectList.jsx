'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Search, BookOpen, ChevronRight, ChevronDown, Folder, ChevronLeft, Loader2, Edit, Trash2, X, XCircle, ArrowRight } from 'lucide-react';
import { useSubjects } from '../context/SubjectContext';
import { useInstitute } from '../context/InstituteContext';

// Debounce hook
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

const SubjectList = () => {
    const router = useRouter();
    const { deleteSubject } = useSubjects();
    const { institute } = useInstitute();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState([]);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // API state
    const [subjects, setSubjects] = useState([]);
    const [allChildren, setAllChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNext: false,
        hasPrev: false
    });

    // Fetch subjects from API
    const fetchSubjects = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                ...(search && { search }),
                instituteId: institute?.id
            });

            const response = await fetch(`/api/subjects?${params}`);
            const data = await response.json();

            if (response.ok) {
                setSubjects(data.subjects || []);
                setAllChildren(data.allChildren || []);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (institute?.id) {
            fetchSubjects(pagination.currentPage, debouncedSearchTerm);
        }
    }, [institute?.id]);

    useEffect(() => {
        fetchSubjects(1, debouncedSearchTerm);
    }, [debouncedSearchTerm]);

    // Build tree structure from paginated top-level subjects + all children
    const subjectTree = useMemo(() => {
        // Combine paginated subjects with all children for tree building
        const allSubjects = [...subjects, ...allChildren];
        const map = {};
        const roots = [];

        // Initialize map
        allSubjects.forEach(s => {
            if (!map[s.id]) {
                map[s.id] = { ...s, children: [] };
            }
        });

        // Build tree - only from current page's top-level subjects
        subjects.forEach(s => {
            if (map[s.id]) {
                roots.push(map[s.id]);
            }
        });

        // Attach children to their parents
        allChildren.forEach(s => {
            if (s.parent_id && map[s.parent_id]) {
                map[s.parent_id].children.push(map[s.id]);
            }
        });

        return roots;
    }, [subjects, allChildren]);

    // Flatten tree for rendering, respecting expanded state
    const getFlattenedSubjects = (nodes, level = 0) => {
        let result = [];
        for (const node of nodes) {
            result.push({ ...node, level });
            if (expandedIds.includes(node.id) && node.children && node.children.length > 0) {
                result = result.concat(getFlattenedSubjects(node.children, level + 1));
            }
        }
        return result;
    };

    const subjectsToRender = useMemo(() => {
        if (debouncedSearchTerm) {
            // If searching, show flat filtered list (already from API)
            return subjects.map(s => ({ ...s, level: 0 }));
        }
        return getFlattenedSubjects(subjectTree);
    }, [subjects, subjectTree, expandedIds, debouncedSearchTerm]);

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this subject?')) {
            const result = await deleteSubject(id);
            if (result.success) {
                setOpenMenuId(null);
                // Refetch current page
                fetchSubjects(pagination.currentPage, debouncedSearchTerm);
            }
        }
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setShowCreateModal(true);
        setOpenMenuId(null);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchSubjects(newPage, debouncedSearchTerm);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="flex-1 mt-6 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Subjects
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage subjects and topics for your question bank
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setShowCreateModal(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={18} />
                        Create Subject
                    </button>
                </div>
            </div>

            {/* Subjects List */}
            <div className="flex flex-col min-h-[400px]">
                {loading && subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading subjects...</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        {subjectsToRender.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <BookOpen size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">No subjects found</h3>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                    {searchTerm
                                        ? `No results found for "${searchTerm}"`
                                        : 'Get started by creating your first subject to organize your questions.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {subjectsToRender.map((subject) => {
                                    const hasChildren = allChildren.some(s => s.parent_id === subject.id);
                                    const isExpanded = expandedIds.includes(subject.id);

                                    return (
                                        <div
                                            key={subject.id}
                                            className="group flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0" style={{ paddingLeft: `${subject.level * 24}px` }}>
                                                {/* Expand/Collapse Toggle */}
                                                <div className="w-6 flex justify-center shrink-0">
                                                    {hasChildren && !searchTerm && (
                                                        <button
                                                            onClick={() => toggleExpand(subject.id)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-blue-50"
                                                        >
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`
                                                    w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                                                    ${subject.level === 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}
                                                `}>
                                                    {subject.level === 0 ? <BookOpen size={18} /> : <Folder size={18} />}
                                                </div>

                                                <div className="flex flex-col truncate">
                                                    <span className={`text-sm truncate ${subject.level === 0 ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                                                        {subject.name}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                                    {subject.questionCount || 0} questions
                                                </span>

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === subject.id ? null : subject.id);
                                                        }}
                                                        className={`p-2 rounded-lg transition-colors ${openMenuId === subject.id ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {openMenuId === subject.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 animate-in zoom-in-95 duration-100 py-1 overflow-hidden">
                                                            <button
                                                                onClick={() => handleEdit(subject)}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-blue-500"
                                                            >
                                                                <Edit size={16} className="text-slate-500" /> Edit Details
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(subject.id)}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-red-500"
                                                            >
                                                                <Trash2 size={16} /> Delete Subject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {!searchTerm && pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
                                <div className="text-xs text-slate-500 font-medium">
                                    Page {pagination.currentPage} of {pagination.totalPages} <span className="text-slate-300 mx-1">|</span> {pagination.totalCount} total subjects
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={!pagination.hasPrev}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {/* Simplified Pagination Numbers */}
                                    <div className="flex items-center gap-1">
                                        {[...Array(pagination.totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            if (
                                                page === 1 ||
                                                page === pagination.totalPages ||
                                                Math.abs(page - pagination.currentPage) <= 1
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => handlePageChange(page)}
                                                        className={`
                                                            w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                                                            ${page === pagination.currentPage
                                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                            }
                                                        `}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (Math.abs(page - pagination.currentPage) === 2) {
                                                return <span key={page} className="text-slate-400 px-1">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={!pagination.hasNext}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateSubjectModal
                    subject={editingSubject}
                    subjects={[...subjects, ...allChildren]}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingSubject(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingSubject(null);
                        fetchSubjects(pagination.currentPage, debouncedSearchTerm);
                    }}
                />
            )}
        </div>
    );
};

const CreateSubjectModal = ({ subject, subjects, onClose, onSuccess }) => {
    const { addSubject, updateSubject } = useSubjects();
    const [formData, setFormData] = useState({
        name: subject?.name || '',
        parent_id: subject?.parent_id || null
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        const result = subject
            ? await updateSubject(subject.id, formData)
            : await addSubject(formData);

        setSaving(false);

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
                            {subject ? 'Edit Subject' : 'Create Subject'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {subject ? 'Update subject details below' : 'Add a new subject category'}
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
                                Parent Subject
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none bg-white"
                                    value={formData.parent_id || ''}
                                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                                >
                                    <option value="">None (Top Level)</option>
                                    {subjects.filter(s => s.id !== subject?.id).map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">
                                Subject Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., Mathematics"
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="px-5 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-70 disabled:shadow-none"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    subject ? 'Update Subject' : 'Create Subject'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubjectList;
