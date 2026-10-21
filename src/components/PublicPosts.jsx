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
        fetchPublicPosts(institute?.id);
        fetchCategories(institute?.id);
    }, [institute?.id]);

    const resolveInstituteId = async (providedId) => {
        if (providedId) return providedId;
        if (institute?.id) return institute.id;
        try {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const slug = parts.length > 2 ? parts[0].toLowerCase() : 'maheshiesacademy';
            const { data } = await supabase
                .from('institute_settings')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();
            if (data?.id) return data.id;
        } catch (e) {
            console.warn('Error resolving institute id:', e);
        }
        return 10;
    };

    const fetchCategories = async (targetInstId) => {
        try {
            const instId = await resolveInstituteId(targetInstId);
            let query = supabase
                .from('categories')
                .select('*')
                .order('name');

            if (instId) {
                query = query.eq('institute_id', instId);
            }

            const { data } = await query;
            setCategories(data || []);
        } catch (e) {
            console.warn('Error fetching categories:', e);
        }
    };

    const fetchPublicPosts = async (targetInstId) => {
        setLoading(true);
        try {
            const instId = await resolveInstituteId(targetInstId);
            let query = supabase
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

            if (instId) {
                query = query.eq('institute_id', instId);
            }

            const { data, error } = await query;

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
        <div style={{ backgroundColor: '#f9fafb', minHeight: '80vh', padding: '20px 20px 60px' }}>
            <div style={{ maxWidth: '1150px', margin: '0 auto' }}>

                {/* Admin Quick Jump Banner */}
                {isAdmin && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#1e40af'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={16} />
                            <span>Viewing <strong>Public Feed</strong>. To create or edit posts, open the Admin Manager.</span>
                        </div>
                        <Link
                            to="/admin/posts"
                            style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '12px'
                            }}
                        >
                            Admin Manager
                        </Link>
                    </div>
                )}

                {/* Compact Single-Line Top Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '20px',
                    backgroundColor: 'white',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                    {/* Left: Title + Count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#111827',
                            margin: 0,
                            letterSpacing: '-0.3px',
                            whiteSpace: 'nowrap'
                        }}>
                            Posts
                        </h1>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            {filteredPosts.length}
                        </span>
                    </div>

                    {/* Right: Search Input + Category Select in one line */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flex: '1',
                        maxWidth: '560px',
                        justifyContent: 'flex-end',
                        minWidth: '280px'
                    }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 32px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '13px',
                                    outline: 'none',
                                    backgroundColor: '#f9fafb'
                                }}
                            />
                        </div>

                        {/* Category Dropdown */}
                        {categories.length > 0 && (
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '13px',
                                    outline: 'none',
                                    backgroundColor: '#f9fafb',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="">All Categories ({posts.length})</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
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
