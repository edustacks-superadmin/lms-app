
import React from 'react';
import { supabaseAdmin } from '../../../../lib/supabase';
import { fetchInstituteServer } from '../../../../lib/server/institute';
import { notFound } from 'next/navigation';
import { Calendar, Eye, Clock, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { processPostContent } from '../../../../lib/content';
import Image from 'next/image';
import TableOfContents from '../../../../components/TableOfContents';
import PublicPostLike from '../../../../components/PublicPostLike';
import PublicPostShare from '../../../../components/PublicPostShare';
import PublicPostViewTracker from '../../../../components/PublicPostViewTracker';
import CommentSection from '../../../../components/CommentSection';
import ReadingProgressBar from '../../../../components/ReadingProgressBar';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';

export const revalidate = 60;

async function getPost(identifier, instituteId) {
    if (!instituteId) return null;

    let query = supabaseAdmin
        .from('posts')
        .select(`
            *,
            institute_settings (
                name,
                logo_url
            ),
            post_tags (
                tag_id,
                tags (
                    id, name, color
                )
            )
        `)
        .eq('institute_id', instituteId)
        .eq('is_deleted', false)
        .eq('status', 'published');

    if (!isNaN(identifier)) {
        query = query.eq('id', identifier);
    } else {
        query = query.eq('slug', identifier);
    }

    const { data: post, error } = await query.single();

    if (error || !post) {
        return null;
    }

    return {
        ...post,
        post_tags: post.post_tags?.map(pt => pt.tags || pt).filter(Boolean) || []
    };
}

async function getRelatedPosts(categoryId, currentPostId, instituteId) {
    if (!categoryId || !instituteId) return [];

    const { data: posts, error } = await supabaseAdmin
        .from('posts')
        .select(`
            id,
            title,
            slug,
            cover_image,
            publication_date,
            view_count,
            created_at,
            category_id
        `)
        .eq('institute_id', instituteId)
        .eq('category_id', categoryId)
        .eq('is_deleted', false)
        .eq('status', 'published')
        .lte('publication_date', new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString())
        .neq('id', currentPostId)
        .order('created_at', { ascending: false })
        .limit(3);

    return error ? [] : (posts || []);
}

async function getSiblingPosts(currentDate, instituteId) {
    if (!currentDate || !instituteId) return { next: null, prev: null };

    // Next post (published after current)
    const { data: nextData } = await supabaseAdmin
        .from('posts')
        .select('id, title, slug, cover_image, publication_date')
        .eq('institute_id', instituteId)
        .eq('status', 'published')
        .eq('is_deleted', false)
        .gt('publication_date', currentDate)
        .order('publication_date', { ascending: true })
        .limit(1)
        .single();

    // Previous post (published before current)
    const { data: prevData } = await supabaseAdmin
        .from('posts')
        .select('id, title, slug, cover_image, publication_date')
        .eq('institute_id', instituteId)
        .eq('status', 'published')
        .eq('is_deleted', false)
        .lt('publication_date', currentDate)
        .order('publication_date', { ascending: false })
        .limit(1)
        .single();

    return {
        next: nextData || null,
        prev: prevData || null
    };
}

export default async function StudentPostDetailPage({ params }) {
    const { id } = await params;
    const institute = await fetchInstituteServer();
    const post = await getPost(id, institute?.id);

    if (!post) {
        notFound();
    }

    const relatedPosts = await getRelatedPosts(post.category_id, post.id, institute?.id);
    const siblings = await getSiblingPosts(post.publication_date, institute?.id);

    // Fetch category separately if not joined
    let category = null;
    if (post.category_id) {
        const { data: catData } = await supabaseAdmin
            .from('categories')
            .select('id, name, color')
            .eq('id', post.category_id)
            .single();
        category = catData;
    }

    const { content: processedContent, headings } = processPostContent(post.content || '');

    // Calculate Read Time
    const cleanText = (post.content || '').replace(/<[^>]*>/g, '');
    const wordsPerMinute = 200;
    const wordCount = cleanText.trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            <ReadingProgressBar />
            <PublicPostViewTracker postId={post.id} />

            {/* Header / Title Section */}
            <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/student/posts"
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">Back to Posts</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <PublicPostShare title={post.title} />
                    </div>
                </div>
            </div>

            <div className="flex-grow max-w-4xl mx-auto w-full py-4 md:py-6 px-4 md:px-6">

                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-400 mb-6 font-medium overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <Link href="/student/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                        <Home size={14} />
                        <span>Home</span>
                    </Link>
                    <span>/</span>
                    <Link href="/student/posts" className="hover:text-blue-600 transition-colors">
                        Posts
                    </Link>
                    {category?.name && (
                        <>
                            <span>/</span>
                            <span
                                className="text-gray-600 px-2 py-0.5 rounded bg-gray-100"
                                style={{ color: category.color, backgroundColor: (category.color || '#3b82f6') + '15' }}
                            >
                                {category.name}
                            </span>
                        </>
                    )}
                </nav>
                <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Cover Image */}
                    {post.cover_image && (
                        <div className="relative aspect-video w-full bg-gray-100">
                            <Image
                                src={post.cover_image}
                                alt={post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <div className="p-6 md:p-10">
                        {/* Meta */}
                        <div className="flex flex-wrap gap-4 text-xs md:text-sm text-gray-500 mb-6 font-medium">
                            {post.publication_date && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span>
                                        {new Date(post.publication_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <Clock size={14} />
                                <span>{readTime} min read</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Eye size={14} />
                                <span>{post.view_count || 0} views</span>
                            </div>

                            <PublicPostLike postId={post.id} initialLikes={post.like_count || 0} />

                            {post.institute_settings?.name && (
                                <div className="flex items-center gap-1.5">
                                    <User size={14} />
                                    <span>{post.institute_settings.name}</span>
                                </div>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                            {post.title}
                        </h1>

                        {/* Tags */}
                        {post.post_tags && post.post_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                {post.post_tags.map(tag => (
                                    <span
                                        key={tag.id}
                                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            backgroundColor: (tag.color || '#3b82f6') + '15',
                                            color: tag.color || '#3b82f6',
                                            border: `1px solid ${(tag.color || '#3b82f6')}30`
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Summary */}
                        {(post.summary || post.description) && (
                            <div className="text-lg text-gray-600 mb-8 italic border-l-4 border-blue-500 pl-6 py-2 bg-blue-50/30 rounded-r-lg">
                                {post.summary || post.description}
                            </div>
                        )}

                        {/* Table of Contents */}
                        {headings.length > 0 && (
                            <div className="mb-10">
                                <TableOfContents headings={headings} inline={true} />
                            </div>
                        )}

                        {/* Content */}
                        <div
                            className="prose prose-lg prose-blue max-w-none text-gray-800"
                            dangerouslySetInnerHTML={{ __html: processedContent }}
                        />
                    </div>
                </article>

                {/* Next & Previous Navigation */}
                {(siblings.next || siblings.prev) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        {siblings.prev ? (
                            <Link
                                href={`/student/posts/${siblings.prev.slug || siblings.prev.id}`}
                                className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-2"
                            >
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <ChevronLeft size={12} strokeWidth={3} />
                                    Previous Post
                                </span>
                                <span className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                    {siblings.prev.title}
                                </span>
                            </Link>
                        ) : <div />}

                        {siblings.next && (
                            <Link
                                href={`/student/posts/${siblings.next.slug || siblings.next.id}`}
                                className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 items-end text-right"
                            >
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Next Post
                                    <ChevronRight size={12} strokeWidth={3} />
                                </span>
                                <span className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                    {siblings.next.title}
                                </span>
                            </Link>
                        )}
                    </div>
                )}

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            Related Posts
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {relatedPosts.map((rp) => (
                                <Link
                                    key={rp.id}
                                    href={`/student/posts/${rp.slug || rp.id}`}
                                    className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                                >
                                    <div className="relative aspect-video bg-gray-50">
                                        <Image
                                            src={rp.cover_image || '/images/default-post.png'}
                                            alt={rp.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                            {rp.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                            <span>{new Date(rp.publication_date || rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            <span>•</span>
                                            <span>{rp.view_count || 0} views</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
