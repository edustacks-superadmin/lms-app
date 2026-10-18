import React, { useState, useEffect } from 'react';
import { Search, Tag, Edit2, MessageSquare, Trash2, Loader, RotateCcw, Eye, FileText, Plus, MoreHorizontal, Calendar, Clock, Check, ChevronLeft, ChevronRight, Globe, Lock, Star, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { usePosts } from '../context/PostContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import CommentSection from './CommentSection';

const PostThumbnail = ({ post }) => {
    const imageSource = post.cover_image ||
        (post.icon && (post.icon.startsWith('http') || post.icon.startsWith('/')) ? post.icon : null) ||
        '/images/default-post.png';

    return (
        <div className="w-24 h-16 md:w-32 md:h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-blue-200 transition-colors">
            <img src={imageSource} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
    );
};

const ActionMenu = ({ post, activeStatus, onEdit, onView, onDelete, onRestore, onPermanentDelete, onComments, hasCommentsOpen }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1">
                <button
                    onClick={onComments}
                    className={`p-2 rounded-lg transition-all ${hasCommentsOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    title="Comments"
                >
                    <MessageSquare size={16} />
                </button>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {activeStatus !== 'deleted' ? (
                            <>
                                <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Edit2 size={14} className="text-slate-400" /> Edit Post
                                </button>
                                <button onClick={() => { onView(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Eye size={14} className="text-slate-400" /> View Public
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <Trash2 size={14} /> Delete to Trash
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { onRestore(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors">
                                    <RotateCcw size={14} /> Restore Post
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { onPermanentDelete(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold">
                                    <Trash2 size={14} /> Delete Permanently
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const PostList = ({ activeStatus = 'published', filters, readOnly = false, userAccess = null }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { posts, loading, deletePost, restorePost, permanentlyDeletePost, togglePostStatus, bulkUpdatePosts, fetchPosts, pagination, stats } = usePosts();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, post: null, isPermanent: false });
    const [expandedComments, setExpandedComments] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);

    // Debounce search and sync with URL
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);

            // Sync with URL
            const currentSearch = searchParams.get('search') || '';
            if (searchQuery !== currentSearch) {
                const params = new URLSearchParams(searchParams);
                if (searchQuery) {
                    params.set('search', searchQuery);
                } else {
                    params.delete('search');
                }
                // Reset to page 1 on new search
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]); // Depend only on searchQuery input

    // Load posts helper
    const loadPosts = () => {
        // Read page from URL, default to 1
        const pageFromUrl = parseInt(searchParams.get('page')) || 1;

        // Determine status: strict 'deleted' if in trash, otherwise prefer filter status (allow '' for All), fallback to activeStatus ('published')
        const statusParam = searchParams.get('status');
        const statusFilter = activeStatus === 'deleted'
            ? 'deleted'
            : (statusParam !== null ? statusParam : (filters?.status !== undefined ? filters.status : ''));

        fetchPosts({
            page: pageFromUrl,
            limit: 10,
            filters: {
                ...filters,
                status: statusFilter,
                search: debouncedSearch,
                categoryId: filters?.category,
                tags: filters?.tags
            },
            sort: filters?.sortBy || 'newest'
        });
    };

    // Initial Fetch & Filter Updates
    useEffect(() => {
        loadPosts();
    }, [activeStatus, filters, debouncedSearch, searchParams]); // Depend on searchParams to refetch on URL change


    // Pagination Handler
    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;

        // Update URL to persist page state
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const toggleComments = (postId) => {
        setExpandedComments(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    const handleDeleteClick = (post, isPermanent = false) => {
        setDeleteModal({ isOpen: true, post, isPermanent });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.post) {
            if (deleteModal.isPermanent) {
                await permanentlyDeletePost(deleteModal.post.id);
            } else {
                await deletePost(deleteModal.post.id);
            }
            setDeleteModal({ isOpen: false, post: null, isPermanent: false });
            loadPosts(); // Refresh list after delete
        }
    };

    const handleRestore = async (id) => {
        try {
            await restorePost(id);
            loadPosts(); // Refresh list after restore
        } catch (error) {
            console.error('Error restoring post:', error);
            alert('Failed to restore post');
        }
    };

    // Stats
    const totalPosts = activeStatus === 'deleted' ? (pagination?.total || 0) : (stats?.total || pagination?.total || 0);
    const publishedCount = stats?.published || 0;
    const draftCount = stats?.draft || 0;
    const publicCount = stats?.public || 0;
    const privateCount = stats?.private || 0;
    const featuredCount = stats?.featured || 0;

    // Fallback logic for stats if API doesn't return everything:
    const visiblePostsSize = posts.length;

    const toggleSelectAll = () => {
        if (selectedIds.length === posts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(posts.map(p => p.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkStatusChange = async (status) => {
        if (selectedIds.length === 0) return;
        const updates = { status };
        if (status === 'published') {
            updates.publication_date = new Date().toISOString();
        }
        await bulkUpdatePosts(selectedIds, updates);
        setSelectedIds([]);
        loadPosts(); // Refresh list after bulk update
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Move ${selectedIds.length} posts to trash?`)) {
            await bulkUpdatePosts(selectedIds, { is_deleted: true });
            setSelectedIds([]);
            loadPosts(); // Refresh list after bulk delete
        }
    };

    const handleStatsClick = (statusValue) => {
        const params = new URLSearchParams(searchParams);
        if (statusValue) {
            params.set('status', statusValue);
        } else {
            params.delete('status');
        }
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleMoreStatsClick = (type, value) => {
        const params = new URLSearchParams(searchParams);

        if (type === 'access_control') {
            if (value && params.get('access_control') !== value) {
                params.set('access_control', value);
            } else {
                params.delete('access_control'); // Toggle off if clicked again or value is empty
            }
        } else if (type === 'featured') {
            if (value && params.get('featured') !== value) {
                params.set('featured', value);
            } else {
                params.delete('featured');
            }
        }

        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    if (loading || (readOnly && userAccess?.loading)) {
        return (
            <div className="flex-1 flex justify-center items-center h-[50vh]">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    const currentStatus = filters?.status || '';
    const currentAccess = filters?.accessControl || '';
    const currentFeatured = filters?.featured || '';

    return (
        <div className="flex-1">
            {/* Stats Dashboard */}
            {!readOnly && activeStatus !== 'deleted' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div
                        onClick={() => {
                            handleStatsClick('');
                            handleMoreStatsClick('access_control', '');
                            handleMoreStatsClick('featured', '');
                        }}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentStatus === '' && !currentAccess && !currentFeatured
                            ? 'border-b-4 border-b-blue-500 bg-blue-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-blue-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold truncate">Total</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{totalPosts}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText size={16} className="text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleStatsClick('published')}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentStatus === 'published'
                            ? 'border-b-4 border-b-emerald-500 bg-emerald-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-emerald-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold truncate">Published</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{publishedCount}</p>
                            </div>
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Check size={16} className="text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleStatsClick('draft')}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentStatus === 'draft'
                            ? 'border-b-4 border-b-amber-500 bg-amber-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-amber-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-amber-600 uppercase tracking-widest font-bold truncate">Drafts</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{draftCount}</p>
                            </div>
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Edit2 size={16} className="text-amber-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleMoreStatsClick('access_control', currentAccess === 'Private' ? '' : 'Private')}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentAccess === 'Private'
                            ? 'border-b-4 border-b-indigo-500 bg-indigo-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-indigo-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold truncate">Private</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{privateCount}</p>
                            </div>
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Lock size={16} className="text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleMoreStatsClick('access_control', currentAccess === 'Public' ? '' : 'Public')}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentAccess === 'Public'
                            ? 'border-b-4 border-b-sky-500 bg-sky-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-sky-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-sky-600 uppercase tracking-widest font-bold truncate">Public</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{publicCount}</p>
                            </div>
                            <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Globe size={16} className="text-sky-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleMoreStatsClick('featured', currentFeatured === 'true' ? '' : 'true')}
                        className={`bg-white rounded-xl border-x border-t p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 h-24 ${currentFeatured === 'true'
                            ? 'border-b-4 border-b-purple-500 bg-purple-50/20'
                            : 'border-b-2 border-b-slate-100 border-slate-200 hover:border-b-purple-300'
                            }`}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className="text-[10px] text-purple-600 uppercase tracking-widest font-bold truncate">Featured</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{featuredCount}</p>
                            </div>
                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Star size={16} className="text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trash View Stats */}
            {!readOnly && activeStatus === 'deleted' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Trash Count</p>
                            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPosts}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                            <Trash2 size={20} className="text-red-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Card Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                {!readOnly && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={selectedIds.length > 0 && selectedIds.length === posts.length}
                                    ref={input => {
                                        if (input) {
                                            input.indeterminate = selectedIds.length > 0 && selectedIds.length < posts.length;
                                        }
                                    }}
                                    onChange={toggleSelectAll}
                                />
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                        {activeStatus === 'deleted' ? 'Trash Bin' : 'Content Management'}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {activeStatus === 'deleted'
                                            ? 'Restore deleted posts or remove them permanently.'
                                            : 'Manage your blog posts, publications, and categories effectively.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80 group flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by title or summary..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={loadPosts}
                                    disabled={loading}
                                    className={`p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all shadow-sm flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Refresh List"
                                >
                                    <RotateCcw size={16} className={`${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {activeStatus !== 'deleted' && (
                                <button
                                    onClick={() => router.push('/admin/posts/create')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/25 text-sm font-bold whitespace-nowrap"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    New Post
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && !readOnly && (
                    <div className="flex items-center justify-between px-6 py-3 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-blue-700">{selectedIds.length} posts selected</span>
                            <div className="h-4 w-px bg-blue-200 mx-1" />
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeStatus !== 'deleted' ? (
                                <>
                                    <button
                                        onClick={() => handleBulkStatusChange('published')}
                                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Publish
                                    </button>
                                    <button
                                        onClick={() => handleBulkStatusChange('draft')}
                                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Unpublish
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    >
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => bulkUpdatePosts(selectedIds, { is_deleted: false }).then(() => setSelectedIds([]))}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                >
                                    Restore Selected
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Post List */}
                <div className="divide-y divide-slate-100">
                    {posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                <FileText size={32} className="text-slate-200" />
                            </div>
                            <h3 className="text-slate-900 font-bold">No results found</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-[250px] text-center font-medium">
                                {searchQuery
                                    ? `We couldn't find anything matching "${searchQuery}"`
                                    : "You haven't created any posts in this category yet."
                                }
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                    View All Posts
                                </button>
                            )}
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div
                                key={post.id}
                                className={`flex items-start gap-5 p-5 hover:bg-slate-50/80 transition-all cursor-pointer group relative ${selectedIds.includes(post.id) ? 'bg-blue-50/50' : ''}`}
                                onClick={() => router.push(`/admin/posts/edit/${post.id}`)}
                            >
                                {!readOnly && (
                                    <div
                                        className="mt-1"
                                        onClick={e => {
                                            e.stopPropagation();
                                            toggleSelect(post.id);
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedIds.includes(post.id)}
                                            onChange={() => { }} // Handled by div onClick
                                        />
                                    </div>
                                )}

                                <PostThumbnail post={post} />

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                                        <h3 className="font-bold text-slate-900 truncate max-w-[300px] md:max-w-none text-base group-hover:text-blue-600 transition-colors">
                                            {post.title?.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ')}
                                        </h3>

                                        {/* Status Badges with Quick Toggle */}
                                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                            {post.status === 'draft' && (
                                                <button
                                                    onClick={() => togglePostStatus(post.id)}
                                                    className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-widest hover:bg-amber-100 transition-colors group/status"
                                                    title="Click to Publish"
                                                >
                                                    <span className="group-hover/status:hidden">Draft</span>
                                                    <span className="hidden group-hover/status:inline">Publish</span>
                                                </button>
                                            )}
                                            {post.status === 'published' && (
                                                <button
                                                    onClick={() => togglePostStatus(post.id)}
                                                    className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest hover:bg-emerald-100 transition-colors group/status"
                                                    title="Click to Move to Draft"
                                                >
                                                    <span className="group-hover/status:hidden flex items-center gap-1">
                                                        {(() => {
                                                            // DB stores as Local Time but sends as UTC/Z. 
                                                            // Strip Z to treat as "face value" local time.
                                                            const cleanDateStr = post.publication_date ? post.publication_date.replace(/Z|[+-]\d{2}:?\d{2}$/, '') : null;
                                                            const isScheduled = cleanDateStr && new Date(cleanDateStr) > new Date();
                                                            return isScheduled ? <Clock size={10} /> : <Check size={10} />;
                                                        })()}
                                                        {(() => {
                                                            const cleanDateStr = post.publication_date ? post.publication_date.replace(/Z|[+-]\d{2}:?\d{2}$/, '') : null;
                                                            return (cleanDateStr && new Date(cleanDateStr) > new Date()) ? 'Scheduled' : 'Published';
                                                        })()}
                                                    </span>
                                                    <span className="hidden group-hover/status:inline">Set Draft</span>
                                                </button>
                                            )}
                                            {post.is_featured && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 uppercase tracking-widest flex items-center gap-1">
                                                    <Star size={8} fill="currentColor" /> Featured
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-500 line-clamp-1 mb-3 font-medium opacity-80">
                                        {(post.description || post.summary)?.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ')}
                                    </p>

                                    {/* Meta Tags Grouping */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {post.categoryName && (
                                            <span
                                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5"
                                                style={{ backgroundColor: post.categoryColor || '#0284c7' }}
                                            >
                                                {post.categoryName}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            {post.post_tags && post.post_tags.slice(0, 2).map(tag => (
                                                <span
                                                    key={tag.id}
                                                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors"
                                                    style={{
                                                        backgroundColor: (tag.color || '#64748b') + '08',
                                                        color: tag.color || '#64748b',
                                                        borderColor: (tag.color || '#64748b') + '20'
                                                    }}
                                                >
                                                    <Tag size={10} strokeWidth={2.5} /> {tag.name}
                                                </span>
                                            ))}
                                            {post.post_tags && post.post_tags.length > 2 && (
                                                <div className="relative group/tooltip cursor-default">
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                                        +{post.post_tags.length - 2}
                                                    </span>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-50 w-max max-w-[200px] pointer-events-none">
                                                        <div className="bg-slate-800 text-white text-[10px] rounded-lg py-2 px-2.5 shadow-xl flex flex-col gap-1 relative">
                                                            {post.post_tags.slice(2).map(tag => (
                                                                <span key={tag.id} className="flex items-center gap-1.5 whitespace-nowrap">
                                                                    <Tag size={8} className="text-slate-400" /> {tag.name}
                                                                </span>
                                                            ))}
                                                            {/* Arrow */}
                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Engagement Stats Inline */}
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-auto">
                                            <div className="flex items-center gap-1.5 hover:text-blue-500 transition-colors" title={`${post.view_count || 0} views`}>
                                                <Eye size={12} className="opacity-50" />
                                                <span>{post.view_count || 0}</span>
                                            </div>
                                            <div
                                                className={`flex items-center gap-1.5 transition-colors ${post.commentCount > 0 ? 'text-emerald-600' : 'hover:text-emerald-500'}`}
                                                title={`${post.commentCount || 0} comments`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleComments(post.id);
                                                }}
                                            >
                                                <MessageSquare size={12} className="opacity-50" />
                                                <span>{post.commentCount || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Publication Date">
                                                <Calendar size={12} className="opacity-50" />
                                                <span>
                                                    {(() => {
                                                        const dateStr = post.publication_date || post.created_at;
                                                        const date = new Date(dateStr);
                                                        const now = new Date();
                                                        const diffTime = Math.abs(now - date);
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                        if (diffDays > 7) {
                                                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                        }
                                                        return formatDistanceToNow(date, { addSuffix: true });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Menu Component - Admin Only */}
                                {!readOnly && (
                                    <ActionMenu
                                        post={post}
                                        activeStatus={activeStatus}
                                        onEdit={() => router.push(`/admin/posts/edit/${post.id}`)}
                                        onView={() => router.push(`/posts/${post.slug || post.id}`)}
                                        onDelete={() => handleDeleteClick(post, false)}
                                        onRestore={() => handleRestore(post.id)}
                                        onPermanentDelete={() => handleDeleteClick(post, true)}
                                        onComments={() => toggleComments(post.id)}
                                        hasCommentsOpen={expandedComments[post.id]}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="text-xs text-slate-500 font-medium">
                            Showing page <span className="font-bold">{pagination.page}</span> of <span className="font-bold">{pagination.totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16} className="text-slate-600" />
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16} className="text-slate-600" />
                            </button>
                        </div>
                    </div>
                )}


                {/* Expanded Comments */}
                {posts.map(post => expandedComments[post.id] && (
                    <div key={`comments-${post.id}`} className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CommentSection postId={post.id} />
                    </div>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, post: null, isPermanent: false })}
                onConfirm={handleDeleteConfirm}
                title={deleteModal.isPermanent ? "Permanently Delete Post" : "Delete Post"}
                message={deleteModal.isPermanent ? "This action cannot be undone. All data associate with this post will be erased." : "This post will be moved to the trash. You can restore it later from the trash bin."}
                itemName={deleteModal.post?.title}
                confirmText={deleteModal.isPermanent ? "Delete Forever" : "Move to Trash"}
            />
        </div>
    );
};

export default PostList;
