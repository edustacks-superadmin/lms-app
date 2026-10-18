
import React from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Tag, User, ChevronRight, Eye, Clock } from 'lucide-react';

import PublicPostFilters from '../../components/PublicPostFilters';
import PublicPostPagination from '../../components/PublicPostPagination';

import { fetchInstituteServer } from '../../lib/server/institute';

export const revalidate = 60;

async function getPosts(instituteId, search = '', categoryId = null, filter = '', page = 1, limit = 9) {
    if (!instituteId) return { posts: [], total: 0 };

    const from = (page - 1) * limit;
    const to = from + limit - 1;

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
        `, { count: 'exact' })
        .eq('institute_id', instituteId)
        .eq('access_control', 'Public')
        .eq('is_deleted', false)
        .eq('status', 'published') // Only show published posts
        // Use IST for comparison to match DB's "Local Time Face Value" storage
        .lte('publication_date', new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString());

    // Apply Filters/Sorting
    if (filter === 'featured') {
        query = query.eq('is_featured', true);
        query = query.order('publication_date', { ascending: false });
    } else if (filter === 'popular') {
        query = query.order('view_count', { ascending: false });
        query = query.order('publication_date', { ascending: false });
    } else {
        // Default sort
        query = query.order('is_featured', { ascending: false });
        query = query.order('publication_date', { ascending: false });
    }

    if (search) {
        query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    // Apply Pagination
    query = query.range(from, to);

    const { data: posts, count, error } = await query;

    if (error) {
        console.error('Error fetching posts:', error);
        return { posts: [], total: 0 };
    }

    const cleanContent = (str) => {
        if (!str || typeof str !== 'string') return str;
        return str.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');
    };

    const formattedPosts = (posts || []).map(post => ({
        ...post,
        title: cleanContent(post.title),
        summary: cleanContent(post.summary),
        description: cleanContent(post.description),
        post_tags: post.post_tags?.map(pt => pt.tags || pt).filter(Boolean) || []
    }));

    return { posts: formattedPosts, total: count || 0 };
}

async function getCategories(instituteId) {
    if (!instituteId) return [];

    // 1. Fetch all public posts to count categories
    const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('category_id')
        .eq('institute_id', instituteId)
        .eq('access_control', 'Public')
        .eq('is_deleted', false)
        .eq('status', 'published') // Only count published posts
        .eq('status', 'published') // Only count published posts
        // Use IST for comparison to match DB's "Local Time Face Value" storage
        .lte('publication_date', new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString())
        .not('category_id', 'is', null);

    // Count posts per category
    const counts = {};
    posts?.forEach(p => {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });

    const categoryIds = Object.keys(counts).map(Number);
    if (categoryIds.length === 0) return [];

    // 2. Fetch category details
    const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

    // Merge counts and sort by popularity
    return (categories || [])
        .map(cat => ({
            ...cat,
            count: counts[cat.id] || 0
        }))
        .sort((a, b) => b.count - a.count);
}

export const metadata = {
    title: 'Academy Insights | Educational Articles & News',
    description: 'Stay updated with the latest educational resources, exam news, and study tips from Mahesh IES Academy.',
    openGraph: {
        title: 'Academy Insights | Educational Articles & News',
        description: 'Stay updated with the latest educational resources, exam news, and study tips from Mahesh IES Academy.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Academy Insights',
        description: 'Latest updates and articles from our academy.',
    }
};

export default async function PostsPage({ searchParams }) {
    const { q, category, filter, page } = await searchParams;
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = 9;

    const institute = await fetchInstituteServer();
    const [{ posts, total }, categories] = await Promise.all([
        getPosts(institute?.id, q, category, filter, currentPage, itemsPerPage),
        getCategories(institute?.id)
    ]);

    return (
        <main className="container mx-auto px-0 md:px-4 py-6 md:py-8 max-w-5xl min-h-screen bg-gray-50 overflow-x-hidden">
            <div className="mb-8 md:mb-12 text-center px-4">
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
                    Academy Insights
                </h1>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-6 md:mb-10">
                    Stay updated with our latest articles, news, and educational resources.
                </p>

                {/* Filters & Dropdown with Search */}
                <React.Suspense fallback={<div className="h-10"></div>}>
                    <PublicPostFilters categories={categories} />
                </React.Suspense>
            </div>

            {posts.length === 0 ? (
                <div className="mx-4 text-center py-16 md:py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-4xl md:text-5xl mb-4 text-gray-400">🔍</div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                        {q ? `No results for "${q}"` : 'No articles found'}
                    </h3>
                    <p className="text-sm md:text-base text-gray-500 mb-6 md:mb-8 px-4">
                        {q ? 'Try different keywords or check back later.' : 'Join our newsletter to be the first to know when we publish!'}
                    </p>
                    {q && (
                        <Link
                            href="/posts"
                            className="inline-flex items-center text-blue-600 font-semibold hover:underline"
                        >
                            View all articles
                        </Link>
                    )}
                </div>
            ) : (
                <div className="px-4 md:px-0">
                    {q && (
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-base md:text-lg font-medium text-gray-700">
                                Results for <span className="font-bold text-gray-900">"{q}"</span>
                            </h3>
                            <Link
                                href="/posts"
                                className="text-xs md:text-sm text-blue-600 font-medium hover:underline"
                            >
                                Clear search
                            </Link>
                        </div>
                    )}

                    {(category || filter) && (
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-base md:text-lg font-medium text-gray-700">
                                Filter: <span className="font-bold text-gray-900">
                                    {category
                                        ? (categories.find(c => c.id === Number(category))?.name || 'Category')
                                        : (filter === 'popular' ? 'Popular' : 'Featured')
                                    }
                                </span>
                            </h3>
                            <Link
                                href="/posts"
                                className="text-xs md:text-sm text-blue-600 font-medium hover:underline"
                            >
                                Clear filter
                            </Link>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/posts/${post.slug || post.id}`}
                                className="group flex flex-col bg-white rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-0.5 md:hover:-translate-y-1"
                            >
                                {/* Card Image */}
                                <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                                    {post.cover_image ? (
                                        <img
                                            src={post.cover_image}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                            <span className="text-3xl md:text-4xl shadow-sm">📄</span>
                                        </div>
                                    )}

                                </div>

                                {/* Card Content */}
                                <div className="flex flex-col flex-grow p-4 md:p-6">
                                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 mb-3 md:mb-4 font-medium uppercase tracking-wider">
                                        {post.publication_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} className="text-gray-400 md:w-3.5 md:h-3.5" />
                                                <time dateTime={post.publication_date}>
                                                    {new Date(post.publication_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </time>
                                            </div>
                                        )}

                                        {/* Pinned Icon */}
                                        {post.is_featured && (
                                            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded md:rounded-md border border-orange-100/50">
                                                <span className="text-xs md:text-sm">📌</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <Eye size={12} className="text-gray-400 md:w-3.5 md:h-3.5" />
                                            <span>{post.view_count || 0}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} className="text-gray-400 md:w-3.5 md:h-3.5" />
                                            <span>{Math.ceil((post.content || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).length / 200)}m</span>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {post.post_tags && post.post_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2.5 md:mb-3">
                                            {post.post_tags.map(pt => pt.tags && (
                                                <span
                                                    key={pt.tags.id}
                                                    className="px-1.5 py-0.5 rounded md:rounded-md text-[8px] md:text-[9px] font-extrabold uppercase tracking-widest transition-colors group-hover:bg-opacity-20"
                                                    style={{
                                                        backgroundColor: pt.tags.color + '15',
                                                        color: pt.tags.color,
                                                        border: `1px solid ${pt.tags.color}30`
                                                    }}
                                                >
                                                    {pt.tags.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <h2 className="text-lg md:text-xl font-bold text-gray-800 md:text-gray-900 mb-2 md:mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                                        {post.title}
                                    </h2>

                                    <p className="text-gray-600 text-xs md:text-sm mb-4 md:mb-6 line-clamp-2 md:line-clamp-3 leading-relaxed">
                                        {post.summary || post.description || 'Discover more about this topic by reading the full article...'}
                                    </p>

                                    <div className="mt-auto flex items-center text-blue-600 font-bold text-[11px] md:text-sm tracking-wide group-hover:gap-2 transition-all">
                                        READ ARTICLE <ChevronRight size={16} className="ml-0.5 md:w-[18px] md:h-[18px] group-hover:ml-0" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    <PublicPostPagination
                        totalItems={total}
                        itemsPerPage={itemsPerPage}
                        currentPage={currentPage}
                    />
                </div>
            )}
        </main>
    );
}
