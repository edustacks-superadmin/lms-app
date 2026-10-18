
import React from 'react';
import { supabaseAdmin } from '../../../lib/supabase';
import { fetchInstituteServer } from '../../../lib/server/institute';
import { notFound } from 'next/navigation';
import { Calendar, Tag, User, Eye, Clock } from 'lucide-react';
import { headers } from 'next/headers';
import PublicPostShare from '../../../components/PublicPostShare';
import PublicPostFollow from '../../../components/PublicPostFollow';
import PublicPostViewTracker from '../../../components/PublicPostViewTracker';
import PublicPostLike from '../../../components/PublicPostLike';
import ReadingProgress from '../../../components/ReadingProgress';
import CommentSection from '../../../components/CommentSection';
import Image from 'next/image';
import TableOfContents from '../../../components/TableOfContents';
import PostCard from '../../../components/PostCard';
import { processPostContent } from '../../../lib/content';

export const revalidate = 60; // Revalidate every 60 seconds

async function getPost(identifier, instituteId) {
    if (!instituteId) return null;

    let query = supabaseAdmin
        .from('posts')
        .select(`
      *,
      institute_settings (
        name,
        logo_url,
        facebook_url,
        instagram_url,
        linkedin_url,
        youtube_url,
        telegram_url,
        blogger_url,
        whatsapp_url,
        arattai_url
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
        .eq('status', 'published'); // Only allow access to published posts

    if (!isNaN(identifier)) {
        query = query.eq('id', identifier);
    } else {
        query = query.eq('slug', identifier);
    }

    const { data: post, error } = await query.single();

    if (error || !post) {
        return null;
    }

    // Standardize mapping
    return {
        ...post,
        post_tags: post.post_tags?.map(pt => pt.tags || pt).filter(Boolean) || []
    };
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const institute = await fetchInstituteServer();
    const post = await getPost(id, institute?.id);

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    const host = (await headers()).get("host") || "edustacks.co.in";
    const protocol = host.includes("localhost") ? "http" : "https";
    const url = `${protocol}://${host}/posts/${post.slug || post.id}`;

    // Truncate description for SEO (optimal is around 160)
    const rawDescription = post.summary || post.description || 'Read this post on our academy.';
    const seoDescription = rawDescription.length > 160
        ? rawDescription.substring(0, 157) + '...'
        : rawDescription;

    return {
        title: post.title,
        description: seoDescription,
        keywords: [
            ...(post.title?.split(' ') || []),
            institute?.name,
            'TNPSC',
            'Academy',
            'Posts',
            'Study Material'
        ].filter(Boolean).join(', '),
        alternates: {
            canonical: url,
        },
        authors: [{ name: institute?.name || 'Mahesh IES Academy' }],
        publisher: institute?.name || 'Mahesh IES Academy',
        openGraph: {
            title: post.title,
            description: seoDescription,
            images: post.cover_image ? [{ url: post.cover_image }] : [],
            type: 'article',
            url: url,
            siteName: institute?.name || 'Mahesh IES Academy',
            publishedTime: post.publication_date || post.created_at,
            authors: [institute?.name || 'Mahesh IES Academy'],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: seoDescription,
            images: post.cover_image ? [post.cover_image] : [],
        },
        robots: {
            index: institute?.meta_robots_index !== 'NoIndex',
            follow: institute?.meta_robots_follow !== 'NoFollow',
            googleBot: {
                index: institute?.meta_robots_index !== 'NoIndex',
                follow: institute?.meta_robots_follow !== 'NoFollow',
            },
        },
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
            summary,
            content,
            product_name,
            access_control,
            allow_comments,
            publication_date,
            allowed_products,
            is_deleted,
            is_featured,
            view_count,
            like_count,
            institute_id,
            created_at,
            category_id,
            institute_settings (
                name,
                logo_url,
                facebook_url,
                instagram_url,
                linkedin_url,
                youtube_url,
                telegram_url,
                blogger_url,
                whatsapp_url,
                arattai_url
            )
        `)
        .eq('institute_id', instituteId)
        .eq('category_id', categoryId)
        .eq('is_deleted', false)
        .eq('status', 'published')
        // Use IST for comparison
        .lte('publication_date', new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString())
        .neq('id', currentPostId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching related posts:', error);
        return [];
    }

    return posts || [];
}

async function getLatestPosts(instituteId, currentPostId) {
    if (!instituteId) return [];

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
        .eq('is_deleted', false)
        .eq('status', 'published')
        .eq('status', 'published')
        // Use IST for comparison
        .lte('publication_date', new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString())
        .neq('id', currentPostId)
        .order('publication_date', { ascending: false })
        .limit(6);

    if (error) {
        console.error('Error fetching latest posts:', error);
        return [];
    }

    return posts || [];
}

export default async function PostPage({ params }) {
    const { id } = await params;
    const institute = await fetchInstituteServer();
    const post = await getPost(id, institute?.id);

    if (!post) {
        notFound();
    }

    const relatedPosts = await getRelatedPosts(post.category_id, post.id, institute?.id);
    const latestPosts = await getLatestPosts(institute?.id, post.id);

    // Calculate Read Time
    // Clean text for word count - using a regex to strip tags is good enough for estimation
    const cleanText = (post.content || '').replace(/<[^>]*>/g, '');
    const wordsPerMinute = 200;
    const wordCount = cleanText.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);

    // Process content for TOC and ID injection
    const { content: processedContent, headings } = processPostContent(post.content || '');

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <ReadingProgress />
            <PublicPostViewTracker postId={post.id} />

            {/* Schema.org Rich Snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": post.title,
                        "description": post.summary || post.description,
                        "image": post.cover_image ? [post.cover_image] : [],
                        "datePublished": post.publication_date || post.created_at,
                        "dateModified": post.updated_at || post.publication_date || post.created_at,
                        "author": {
                            "@type": "Organization",
                            "name": post.institute_settings?.name || "Mahesh IES Academy",
                            "url": `https://${post.institute_settings?.slug}.edustacks.co.in`
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "Mahesh IES Academy",
                            "logo": {
                                "@type": "ImageObject",
                                "url": post.institute_settings?.logo_url || ""
                            }
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": `https://${post.institute_settings?.slug}.edustacks.co.in/posts/${post.slug || post.id}`
                        }
                    })
                }}
            />
            <div className="flex-grow container mx-auto px-0 md:px-4 py-4 md:py-8 max-w-7xl w-full">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
                    {/* Main Content Column */}
                    <div className="min-w-0">
                        <article className="bg-white md:rounded-xl md:shadow-sm overflow-hidden border-b md:border border-gray-100 w-full mb-8 md:mb-12">
                            {/* Cover Image */}
                            <div className="w-full bg-gray-100 flex justify-center border-b border-gray-100 relative aspect-video">
                                <Image
                                    src={post.cover_image || '/images/default-post.png'}
                                    alt={post.title}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    priority
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="p-4 md:p-10">
                                {/* Meta */}
                                <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-gray-500 mb-6 font-medium">
                                    {post.publication_date && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="md:w-4 md:h-4" />
                                            <time dateTime={post.publication_date}>
                                                {new Date(post.publication_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </time>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1.5 text-orange-600">
                                        <Clock size={14} className="md:w-4 md:h-4" />
                                        <span>{readTime} min read</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-blue-600">
                                        <Eye size={14} className="md:w-4 md:h-4" />
                                        <span>{post.view_count || 0} views</span>
                                    </div>

                                    <PublicPostLike postId={post.id} initialLikes={post.like_count || 0} />
                                    <PublicPostShare title={post.title} />
                                    {post.institute_settings && (
                                        <PublicPostFollow settings={post.institute_settings} />
                                    )}

                                    {post.institute_settings?.name && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <User size={14} className="text-gray-400 md:w-4 md:h-4" />
                                            <span className="font-semibold text-gray-700">{post.institute_settings.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight" style={{ textWrap: 'balance' }}>
                                    {post.title}
                                </h1>

                                {/* Tags */}
                                {post.post_tags && post.post_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {post.post_tags.map(tag => (
                                            <span
                                                key={tag.id}
                                                className="px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                                style={{
                                                    backgroundColor: (tag.color || '#64748b') + '15',
                                                    color: tag.color || '#64748b',
                                                    border: `1px solid ${(tag.color || '#64748b')}25`
                                                }}
                                            >
                                                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full" style={{ backgroundColor: tag.color || '#64748b' }}></div>
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Summary */}
                                {(post.summary || post.description) && (
                                    <div className="text-base md:text-lg text-gray-600 mb-8 italic border-l-4 border-gray-200 pl-4">
                                        {post.summary || post.description}
                                    </div>
                                )}

                                {/* Table of Contents (Inline) */}
                                <TableOfContents headings={headings} inline={true} />

                                {/* Content */}
                                <div className="overflow-x-auto w-full">
                                    <div
                                        className="prose md:prose-lg prose-fix max-w-none text-gray-800"
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            wordBreak: 'normal',
                                            hyphens: 'none'
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: processedContent
                                                .replace(/\u00A0/g, ' ')
                                                .replace(/&nbsp;/g, ' ')
                                        }}
                                    />
                                </div>

                                {/* Private Indicator (Optional) */}
                                {post.access_control === 'Private' && (
                                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-2 text-sm text-amber-600 font-medium">
                                        <Tag size={14} />
                                        <span>Private Member Content</span>
                                    </div>
                                )}
                            </div>

                            {/* Comments Section */}
                            {post.allow_comments && (
                                <div className="px-6 md:px-10 pb-10 border-t border-gray-50">
                                    <CommentSection postId={post.id} />
                                </div>
                            )}
                        </article>

                        {/* Related Posts Section */}
                        {relatedPosts.length > 0 && (
                            <div className="mt-16 w-full px-4 md:px-0">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                                        Related Posts
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    {relatedPosts.map((rp) => (
                                        <a
                                            key={rp.id}
                                            href={`/posts/${rp.slug || rp.id}`}
                                            className="group block bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-50 relative">
                                                <Image
                                                    src={rp.cover_image || '/images/default-post.png'}
                                                    alt={rp.title}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                    className="group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors mb-2">
                                                    {rp.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        <span>
                                                            {new Date(rp.created_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Eye size={12} />
                                                        <span>{rp.view_count || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Latest Posts Sidebar */}
                    <aside className="hidden lg:block relative w-[280px]">
                        <div className="sticky top-24">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                                        Latest Updates
                                    </h3>
                                </div>

                                <div className="flex flex-col divide-y divide-gray-50">
                                    {latestPosts.length > 0 ? latestPosts.map((lp, index) => (
                                        <a
                                            key={lp.id}
                                            href={`/posts/${lp.slug || lp.id}`}
                                            className="group block p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden relative border border-gray-50 mb-3">
                                                <Image
                                                    src={lp.cover_image || '/images/default-post.png'}
                                                    alt={lp.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    sizes="(max-width: 768px) 100vw, 240px"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 mb-2">
                                                    {lp.title}
                                                </h4>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                                    <time>
                                                        {new Date(lp.publication_date || lp.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </time>
                                                    {lp.view_count > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Eye size={12} />
                                                            <span>{lp.view_count}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    )) : (
                                        <div className="p-4 text-sm text-gray-500 italic text-center">No recent updates.</div>
                                    )}
                                </div>

                                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                                    <a href="/posts" className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors">
                                        View All Posts
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
