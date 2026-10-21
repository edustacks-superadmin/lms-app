import React, { useState, useEffect } from 'react';
import { Tag, Edit2, MessageSquare, HelpCircle, Trash2, Loader, RotateCcw, Share2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePosts } from '../context/PostContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import CommentSection from './CommentSection';

const PostList = ({ activeStatus = 'published', filters, readOnly = false, userAccess = null }) => {
    const navigate = useNavigate();
    const { posts, loading, deletePost, restorePost } = usePosts();
    const { showToast } = useToast();
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, post: null });
    const [expandedComments, setExpandedComments] = useState({});
    const [copiedPostId, setCopiedPostId] = useState(null);

    const toggleComments = (postId) => {
        setExpandedComments(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    useEffect(() => {
        filterAndSortPosts();
    }, [posts, activeStatus, filters, userAccess]);

    const filterAndSortPosts = () => {
        let result = [...posts];

        // Filter by status (published/deleted)
        result = result.filter(post => {
            if (activeStatus === 'deleted') {
                return post.is_deleted === true;
            } else {
                return post.is_deleted !== true;
            }
        });

        // Filter by visibility (for students)
        if (readOnly && userAccess && !userAccess.loading) {
            result = result.filter(post => {
                // 1. Public posts are always visible
                if (post.access_control === 'Public') return true;

                // 2. Check Batches
                const hasBatchAccess = post.batches && post.batches.some(batchId => userAccess.batches.includes(batchId));
                if (hasBatchAccess) return true;

                // 3. Check Products
                const hasProductAccess = post.allowedProducts && post.allowedProducts.some(productId => userAccess.products.includes(productId));
                if (hasProductAccess) return true;

                return false;
            });
        }

        // Filter by category
        if (filters?.category) {
            result = result.filter(post => String(post.category_id) === String(filters.category));
        }

        // Filter by date range
        if (filters?.dateFrom) {
            result = result.filter(post => new Date(post.created_at) >= new Date(filters.dateFrom));
        }
        if (filters?.dateTo) {
            result = result.filter(post => new Date(post.created_at) <= new Date(filters.dateTo));
        }

        // Sort
        if (filters?.sortBy) {
            switch (filters.sortBy) {
                case 'newest':
                    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'oldest':
                    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    break;
                case 'title_asc':
                    result.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'title_desc':
                    result.sort((a, b) => b.title.localeCompare(a.title));
                    break;
                default:
                    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
        } else {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        setFilteredPosts(result);
    };

    const handleDeleteClick = (post) => {
        setDeleteModal({ isOpen: true, post });
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.post) {
            await deletePost(deleteModal.post.id);
            setDeleteModal({ isOpen: false, post: null });
        }
    };

    const handleRestore = async (id) => {
        try {
            await restorePost(id);
        } catch (error) {
            console.error('Error restoring post:', error);
            alert('Failed to restore post');
        }
    };

    const handleCopyLink = async (post) => {
        const shareUrl = `${window.location.origin}/post/${post.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.summary || post.description || post.title,
                    url: shareUrl
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedPostId(post.id);
            showToast('Post link copied to clipboard!', 'success');
            setTimeout(() => setCopiedPostId(null), 2500);
        } catch (err) {
            showToast('Failed to copy link', 'error');
        }
    };


    if (loading || (readOnly && userAccess?.loading)) {
        return (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader className="animate-spin" size={32} color="#00bfa5" />
            </div>
        );
    }

    return (
        <div style={{ flex: 1 }}>
            {/* Top Controls */}
            <div className="post-list-header">
                <h2 style={{ fontSize: '24px', fontWeight: '400', margin: 0 }}>
                    Posts {activeStatus === 'deleted' && '- Deleted'}
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {!readOnly && (
                        <button
                            className="btn btn-outline"
                            style={{ background: '#f5f5f5', border: '1px solid #ddd', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => navigate('/posts/categories')}
                        >
                            <Tag size={16} /> Categories
                        </button>
                    )}
                </div>
            </div>

            {/* Post List */}
            <div className="post-list-container">
                {filteredPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                        {activeStatus === 'deleted' ? 'No deleted posts found.' : 'No posts found.'}
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <div key={post.id} className="post-item">
                            <h3
                                style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    color: '#1f2937',
                                    transition: 'color 0.2s'
                                }}
                                onClick={() => navigate(`/post/${post.id}`)}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#1f2937'}
                                title="Click to open full post"
                            >
                                {post.icon && <span>{post.icon}</span>}
                                {post.title}
                            </h3>
                            <p style={{ color: '#555', fontSize: '14px', marginBottom: '12px', lineHeight: '1.5' }}>
                                {post.description || post.summary}
                            </p>

                            <div className="post-meta">
                                <span>Written {post.date || new Date(post.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                {post.tag && (
                                    <>
                                        <span style={{
                                            backgroundColor: post.tagColor || '#000',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Tag size={10} fill="white" /> {post.tag}
                                        </span>
                                        <span>•</span>
                                    </>
                                )}
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', color: 'var(--primary-color)' }}>
                                    <span
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: expandedComments[post.id] ? 'var(--primary-color)' : '#666'
                                        }}
                                        onClick={() => toggleComments(post.id)}
                                    >
                                        <MessageSquare size={16} />
                                        {expandedComments[post.id] ? 'Hide Comments' : 'Comments'}
                                    </span>

                                    <span
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: copiedPostId === post.id ? '#10b981' : '#4b5563',
                                            fontWeight: copiedPostId === post.id ? '600' : 'normal'
                                        }}
                                        onClick={() => handleCopyLink(post)}
                                        title="Copy link to this post"
                                    >
                                        {copiedPostId === post.id ? (
                                            <>
                                                <Check size={16} color="#10b981" />
                                                <span style={{ color: '#10b981' }}>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Share2 size={16} />
                                                <span>Copy Link</span>
                                            </>
                                        )}
                                    </span>

                                    {!readOnly && activeStatus !== 'deleted' && (
                                        <>
                                            <span
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                onClick={() => navigate(`/posts/edit/${post.id}`)}
                                            >
                                                Edit
                                            </span>
                                            <span
                                                style={{
                                                    cursor: 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#999',
                                                    position: 'relative'
                                                }}
                                                title="Coming Soon"
                                            >
                                                View Questions
                                                <span style={{
                                                    fontSize: '9px',
                                                    backgroundColor: '#ffa726',
                                                    color: 'white',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    marginLeft: '4px'
                                                }}>
                                                    SOON
                                                </span>
                                            </span>
                                            <span
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d4f' }}
                                                onClick={() => handleDeleteClick(post)}
                                            >
                                                Delete
                                            </span>
                                        </>
                                    )}
                                    {!readOnly && activeStatus === 'deleted' && (
                                        <span
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#00bfa5' }}
                                            onClick={() => handleRestore(post.id)}
                                        >
                                            <RotateCcw size={14} /> Restore
                                        </span>
                                    )}
                                </div>
                            </div>

                            {
                                expandedComments[post.id] && (
                                    <CommentSection postId={post.id} />
                                )
                            }
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, post: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Post"
                message="This post will be permanently deleted and cannot be recovered."
                itemName={deleteModal.post?.title}
                confirmText="Delete Post"
            />
        </div >
    );
};

export default PostList;
