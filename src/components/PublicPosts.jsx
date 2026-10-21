import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Calendar, Tag, Search, ArrowRight, Share2, Check, Loader2, Sparkles, Shield } from 'lucide-react';

const PublicPosts = () => {
    const navigate = useNavigate();
    const { institute } = useInstitute();
    const { role } = useAuth();
    const { showToast } = useToast();

    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [copiedPostId, setCopiedPostId] = useState(null);

    useEffect(() => {
        fetchPublicPosts();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            setCategories(data || []);
        } catch (e) {
            console.warn('Error fetching categories:', e);
        }
    };

    const fetchPublicPosts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    id,
                    title,
                    summary,
                    description,
                    cover_image,
                    icon,
                    created_at,
                    publication_date,
                    access_control,
                    category_id,
                    categories (
                        id,
                        name,
                        color
                    )
                `)
                .eq('is_deleted', false)
                .eq('access_control', 'Public')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error('Error fetching public posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async (e, post) => {
        e.stopPropagation();
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
            showToast('Link copied to clipboard!', 'success');
            setTimeout(() => setCopiedPostId(null), 2500);
        } catch (err) {
            showToast('Failed to copy link', 'error');
        }
    };

    const filteredPosts = posts.filter(post => {
        const matchesCategory = !selectedCategory || String(post.category_id) === String(selectedCategory);
        const matchesSearch = !searchQuery ||
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'teacher';

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '80vh', padding: '40px 20px 80px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

                {/* Admin Quick Jump Banner */}
                {isAdmin && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '12px 18px',
                        borderRadius: '10px',
                        marginBottom: '28px',
                        fontSize: '14px',
                        color: '#1e40af'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={18} />
                            <span>You are viewing the <strong>Public Posts Feed</strong>. To create or manage posts, go to the Admin Manager.</span>
                        </div>
                        <Link
                            to="/admin/posts"
                            style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '13px'
                            }}
                        >
                            Open Admin Posts
                        </Link>
                    </div>
                )}

                {/* Hero Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#eff6ff',
                        color: 'var(--primary-color, #2563eb)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '12px'
                    }}>
                        <Sparkles size={14} />
                        <span>Latest Articles & Announcements</span>
                    </div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        color: '#111827',
                        margin: '0 0 10px',
                        letterSpacing: '-0.5px'
                    }}>
                        {institute?.name ? `${institute.name} Posts` : 'Academy Posts & Updates'}
                    </h1>
                    <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 auto', maxWidth: '600px' }}>
                        Stay informed with the latest exam strategies, subject guides, announcements, and preparation insights.
                    </p>
                </div>

                {/* Search & Category Filter Controls */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', maxWidth: '520px', margin: '0 auto', width: '100%' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search posts by title or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 42px',
                                borderRadius: '10px',
                                border: '1px solid #e5e7eb',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                            }}
                        />
                    </div>

                    {/* Category Filter Pills */}
                    {categories.length > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginTop: '8px'
                        }}>
                            <button
                                onClick={() => setSelectedCategory('')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: selectedCategory === '' ? 'var(--primary-color, #2563eb)' : '#e5e7eb',
                                    backgroundColor: selectedCategory === '' ? 'var(--primary-color, #2563eb)' : 'white',
                                    color: selectedCategory === '' ? 'white' : '#4b5563',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                All Posts ({posts.length})
                            </button>
                            {categories.map(cat => {
                                const isSelected = String(selectedCategory) === String(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(isSelected ? '' : cat.id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            border: '1px solid',
                                            borderColor: isSelected ? (cat.color || 'var(--primary-color)') : '#e5e7eb',
                                            backgroundColor: isSelected ? (cat.color || 'var(--primary-color)') : 'white',
                                            color: isSelected ? 'white' : '#4b5563',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Posts Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                        <Loader2 className="animate-spin" size={36} color="var(--primary-color, #2563eb)" style={{ margin: '0 auto 12px' }} />
                        <p style={{ margin: 0, fontSize: '15px' }}>Loading posts...</p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        backgroundColor: 'white',
                        padding: '60px 20px',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                            No posts found
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                            {searchQuery || selectedCategory ? 'Try clearing your search or category filter.' : 'Check back soon for new updates and articles.'}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredPosts.map(post => {
                            const dateStr = new Date(post.publication_date || post.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });

                            return (
                                <div
                                    key={post.id}
                                    onClick={() => navigate(`/post/${post.id}`)}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '14px',
                                        border: '1px solid #e5e7eb',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                    }}
                                >
                                    {/* Cover Image if available */}
                                    {post.cover_image && (
                                        <div style={{ height: '180px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                                            <img
                                                src={post.cover_image}
                                                alt={post.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        {/* Meta: Category & Date */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            {post.categories?.name ? (
                                                <span style={{
                                                    backgroundColor: post.categories?.color || '#2563eb',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    <Tag size={10} fill="white" />
                                                    {post.categories.name}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Article</span>
                                            )}

                                            <span style={{ fontSize: '12px', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={12} />
                                                {dateStr}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            color: '#111827',
                                            margin: '0 0 10px',
                                            lineHeight: '1.4'
                                        }}>
                                            {post.icon && <span style={{ marginRight: '6px' }}>{post.icon}</span>}
                                            {post.title}
                                        </h3>

                                        {/* Excerpt */}
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#64748b',
                                            lineHeight: '1.6',
                                            margin: '0 0 20px',
                                            flex: 1,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {post.summary || post.description || 'Click to read full post...'}
                                        </p>

                                        {/* Footer: Read More + Share Link */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderTop: '1px solid #f1f5f9',
                                            paddingTop: '14px',
                                            marginTop: 'auto'
                                        }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: 'var(--primary-color, #2563eb)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                Read More <ArrowRight size={14} />
                                            </span>

                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyLink(e, post)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '6px',
                                                    cursor: 'pointer',
                                                    color: copiedPostId === post.id ? '#10b981' : '#9ca3af',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    borderRadius: '6px'
                                                }}
                                                title="Copy share link"
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = copiedPostId === post.id ? '#10b981' : '#9ca3af'}
                                            >
                                                {copiedPostId === post.id ? (
                                                    <>
                                                        <Check size={14} color="#10b981" />
                                                        <span style={{ color: '#10b981' }}>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Share2 size={14} />
                                                        <span>Share</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicPosts;
