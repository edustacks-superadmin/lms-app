import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePosts } from '../context/PostContext';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Tag, Calendar, Share2, Check, MessageSquare, Edit2, Lock, Loader2 } from 'lucide-react';
import CommentSection from './CommentSection';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPostById } = usePosts();
    const { institute } = useInstitute();
    const { user, role } = useAuth();
    const { showToast } = useToast();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [hasAccess, setHasAccess] = useState(true);
    const [accessReason, setAccessReason] = useState('');

    useEffect(() => {
        if (id) {
            loadPost();
        }
    }, [id]);

    const loadPost = async () => {
        setLoading(true);
        try {
            const data = await getPostById(id);
            if (!data) {
                setPost(null);
                setLoading(false);
                return;
            }

            if (institute?.id && data.institute_id && data.institute_id !== institute.id) {
                setPost(null);
                setHasAccess(false);
                setAccessReason('This post is not available for this academy.');
                setLoading(false);
                return;
            }
            setPost(data);

            // Check access if not admin
            if (role !== 'admin' && role !== 'superadmin' && role !== 'teacher') {
                if (data.access_control === 'Private') {
                    if (!user) {
                        setHasAccess(false);
                        setAccessReason('Please sign in to access this private post.');
                    } else {
                        // Check batches & products
                        const { data: member } = await supabase
                            .from('members')
                            .select('id')
                            .eq('email', user.email)
                            .maybeSingle();

                        if (!member) {
                            setHasAccess(false);
                            setAccessReason('You do not have access to this post.');
                        } else {
                            const { data: batchMembers } = await supabase
                                .from('batch_members')
                                .select('batch_id')
                                .eq('member_id', member.id);

                            const userBatchIds = batchMembers?.map(bm => bm.batch_id) || [];
                            const batchMatch = data.batches && data.batches.some(b => userBatchIds.includes(b));

                            if (batchMatch || !data.batches || data.batches.length === 0) {
                                setHasAccess(true);
                            } else {
                                setHasAccess(false);
                                setAccessReason('This post is restricted to specific batches.');
                            }
                        }
                    }
                } else {
                    setHasAccess(true);
                }
            } else {
                setHasAccess(true);
            }
        } catch (err) {
            console.error('Error loading post:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        // Construct the shareable link (works for both public and authenticated users)
        const shareUrl = `${window.location.origin}/post/${id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: post?.title || 'Post',
                    text: post?.summary || post?.description || post?.title,
                    url: shareUrl
                });
                return;
            } catch (err) {
                // If user cancels share sheet, ignore; if fails, fallback to clipboard
                if (err.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            showToast('Post link copied to clipboard!', 'success');
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            showToast('Failed to copy link', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '12px',
                color: '#6b7280'
            }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary-color, #2563eb)" />
                <p style={{ margin: 0, fontSize: '15px' }}>Loading post...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div style={{
                maxWidth: '720px',
                margin: '40px auto',
                padding: '40px 24px',
                textAlign: 'center',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                    Post Not Found
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    The post you are looking for may have been removed or is temporarily unavailable.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--primary-color, #2563eb)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px'
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const isAdmin = role === 'admin' || role === 'superadmin';

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '24px 20px 60px'
        }}>
            {/* Top Navigation & Action Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#4b5563',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <ArrowLeft size={18} />
                    Back to Posts
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isAdmin && (
                        <button
                            onClick={() => navigate(`/admin/posts/edit/${post.id}`)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <Edit2 size={15} />
                            Edit Post
                        </button>
                    )}

                    <button
                        onClick={handleShare}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: copied ? '#10b981' : 'var(--primary-color, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                        }}
                    >
                        {copied ? <Check size={16} /> : <Share2 size={16} />}
                        {copied ? 'Link Copied!' : 'Share / Copy Link'}
                    </button>
                </div>
            </div>

            {/* Main Post Content Card */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                padding: '32px'
            }}>
                {/* Meta details: Category tag & Date */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                }}>
                    {post.tag && (
                        <span style={{
                            backgroundColor: post.tagColor || 'var(--primary-color, #2563eb)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <Tag size={12} fill="white" />
                            {post.tag}
                        </span>
                    )}

                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#6b7280',
                        fontSize: '13px'
                    }}>
                        <Calendar size={14} />
                        Written {post.date || new Date(post.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>

                {/* Post Title */}
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: '#111827',
                    lineHeight: '1.3',
                    marginBottom: '18px',
                    letterSpacing: '-0.5px'
                }}>
                    {post.icon && <span style={{ marginRight: '8px' }}>{post.icon}</span>}
                    {post.title}
                </h1>

                {/* Summary / Subtitle if available */}
                {(post.summary || post.description) && (
                    <p style={{
                        fontSize: '16px',
                        color: '#4b5563',
                        lineHeight: '1.6',
                        marginBottom: '24px',
                        fontStyle: 'italic',
                        borderLeft: '3px solid var(--primary-color, #2563eb)',
                        paddingLeft: '14px'
                    }}>
                        {post.summary || post.description}
                    </p>
                )}

                {/* Cover Image if available */}
                {post.cover_image && (
                    <div style={{ marginBottom: '28px', borderRadius: '12px', overflow: 'hidden' }}>
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            style={{
                                width: '100%',
                                maxHeight: '450px',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                    </div>
                )}

                {/* Access Check */}
                {!hasAccess ? (
                    <div style={{
                        padding: '32px 24px',
                        textAlign: 'center',
                        backgroundColor: '#fef2f2',
                        borderRadius: '12px',
                        border: '1px solid #fee2e2',
                        margin: '24px 0'
                    }}>
                        <Lock size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                            Restricted Content
                        </h3>
                        <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '20px' }}>
                            {accessReason || 'This post is restricted to enrolled students.'}
                        </p>
                        {!user && (
                            <Link
                                to="/login"
                                style={{
                                    display: 'inline-block',
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--primary-color, #2563eb)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Log in to Access
                            </Link>
                        )}
                    </div>
                ) : (
                    /* Rich Text Content */
                    <div
                        className="post-body-content"
                        style={{
                            fontSize: '16px',
                            color: '#1f2937',
                            lineHeight: '1.8',
                            marginTop: '20px'
                        }}
                        dangerouslySetInnerHTML={{ __html: post.content || '<p style="color: #6b7280;">No additional content in this post.</p>' }}
                    />
                )}
            </div>

            {/* Comments Section */}
            {hasAccess && post.allow_comments !== false && (
                <div style={{
                    marginTop: '32px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e5e7eb',
                    padding: '24px 32px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <MessageSquare size={18} color="var(--primary-color, #2563eb)" />
                        Comments & Discussion
                    </h3>
                    <CommentSection postId={post.id} />
                </div>
            )}
        </div>
    );
};

export default PostDetail;
