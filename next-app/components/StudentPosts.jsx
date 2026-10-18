'use client';

import React, { useState, useEffect, Suspense } from 'react';
import StudentPostCard from './StudentPostCard';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { supabase } from '../supabaseClient';
import { ArrowUpDown, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const StudentPostsContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { institute } = useInstitute();

    const [categories, setCategories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

    // Pagination & Filter state
    const itemsPerPage = 6;
    const currentPage = parseInt(searchParams.get('page')) || 1;

    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        sortBy: searchParams.get('sort') || 'newest'
    });
    const [userAccess, setUserAccess] = useState({
        batches: [],
        products: [],
        loading: true
    });

    useEffect(() => {
        if (user?.email) {
            fetchUserAccess();
        }

        if (institute?.id) {
            fetchCategories();
            fetchPosts();
        }
    }, [user, institute?.id]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (filters.category) params.set('category', filters.category);
        else params.delete('category');

        if (filters.sortBy !== 'newest') params.set('sort', filters.sortBy);
        else params.delete('sort');

        if (searchQuery) params.set('q', searchQuery);
        else params.delete('q');

        // Reset to page 1 on filter/search change if not already specified
        if (!searchParams.get('page') && (filters.category || filters.sortBy !== 'newest' || searchQuery)) {
            params.delete('page');
        }

        const timeoutId = setTimeout(() => {
            router.replace(`/student/posts?${params.toString()}`, { scroll: false });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters, searchQuery]);

    // Refetch when filters or access changes
    useEffect(() => {
        if (institute?.id && !userAccess.loading) {
            fetchPosts();
        }
    }, [filters.category, filters.sortBy, institute?.id, userAccess.loading]);

    const fetchCategories = async () => {
        if (!institute?.id) return;

        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .eq('institute_id', institute.id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchPosts = async () => {
        if (!institute?.id) return;

        setLoading(true);
        try {
            const now = new Date().toISOString();

            let query = supabase
                .from('posts')
                .select(`
                    id,
                    title,
                    slug,
                    summary,
                    description,
                    content,
                    cover_image,
                    icon,
                    category_id,
                    publication_date,
                    created_at,
                    view_count,
                    is_featured,
                    access_control,
                    allowed_products,
                    post_batches (batch_id)
                `)
                .eq('institute_id', institute.id)
                .eq('status', 'published')
                .eq('is_deleted', false)
                .lte('publication_date', now);

            // Apply category filter
            if (filters.category) {
                query = query.eq('category_id', filters.category);
            }

            // Apply sorting
            if (filters.sortBy === 'newest') {
                query = query.order('is_featured', { ascending: false })
                    .order('publication_date', { ascending: false });
            } else if (filters.sortBy === 'oldest') {
                query = query.order('publication_date', { ascending: true });
            } else if (filters.sortBy === 'title_asc') {
                query = query.order('title', { ascending: true });
            } else if (filters.sortBy === 'title_desc') {
                query = query.order('title', { ascending: false });
            }

            const { data: postsData, error } = await query;

            if (error) throw error;

            // Fetch categories for mapping
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('id, name, color');

            const categoryMap = {};
            if (categoriesData) {
                categoriesData.forEach(cat => (categoryMap[cat.id] = cat));
            }

            // Filter posts based on user access
            const filteredPosts = (postsData || []).filter(post => {
                // Public posts are always visible
                if (post.access_control === 'Public' || !post.access_control) return true;

                // Private posts require access check
                if (post.access_control === 'Private') {
                    // Check if user has access via products
                    const hasProductAccess = post.allowed_products && post.allowed_products.length > 0
                        ? post.allowed_products.some(pid => userAccess.products.includes(pid))
                        : false;

                    // Check if user has access via batches
                    const postBatchIds = post.post_batches?.map(pb => pb.batch_id) || [];
                    const hasBatchAccess = postBatchIds.length > 0
                        ? postBatchIds.some(bid => userAccess.batches.includes(bid))
                        : false;

                    return hasProductAccess || hasBatchAccess;
                }

                return true;
            });

            // Map posts with category info
            let formattedPosts = filteredPosts.map(post => ({
                ...post,
                categoryName: categoryMap[post.category_id]?.name,
                categoryColor: categoryMap[post.category_id]?.color
            }));

            // Client-side search logic
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                formattedPosts = formattedPosts.filter(post =>
                    post.title.toLowerCase().includes(query) ||
                    (post.summary && post.summary.toLowerCase().includes(query)) ||
                    (post.categoryName && post.categoryName.toLowerCase().includes(query))
                );
            }

            setPosts(formattedPosts);

            // Validate currentPage
            const maxPage = Math.ceil(formattedPosts.length / itemsPerPage);
            if (currentPage > maxPage && maxPage > 0) {
                const params = new URLSearchParams(searchParams);
                params.set('page', maxPage);
                router.replace(`/student/posts?${params.toString()}`);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserAccess = async () => {
        try {
            const { data: member } = await supabase
                .from('members')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!member) {
                setUserAccess(prev => ({ ...prev, loading: false }));
                return;
            }

            const { data: batchMembers } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', member.id);

            const batchIds = batchMembers?.map(bm => bm.batch_id) || [];

            const { data: orders } = await supabase
                .from('orders')
                .select('product_id')
                .eq('user_email', user.email)
                .eq('status', 'completed');

            const productIds = orders?.map(o => o.product_id) || [];

            setUserAccess({
                batches: batchIds,
                products: productIds,
                loading: false
            });

        } catch (error) {
            console.error('Error fetching user access:', error);
            setUserAccess(prev => ({ ...prev, loading: false }));
        }
    };

    const handleCategorySelect = (categoryId) => {
        setFilters(prev => ({ ...prev, category: categoryId }));
        const params = new URLSearchParams(searchParams);
        params.delete('page'); // Reset to first page
        if (categoryId) params.set('category', categoryId);
        else params.delete('category');
        router.push(`/student/posts?${params.toString()}`);
    };

    const handleTagClick = (categoryId) => {
        handleCategorySelect(categoryId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSortChange = (e) => {
        const sortValue = e.target.value;
        setFilters(prev => ({ ...prev, sortBy: sortValue }));
        const params = new URLSearchParams(searchParams);
        params.delete('page'); // Reset to first page
        params.set('sort', sortValue);
        router.push(`/student/posts?${params.toString()}`);
    };

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage);
        router.push(`/student/posts?${params.toString()}`);
    };

    // Calculate pagination
    const totalPages = Math.ceil(posts.length / itemsPerPage);
    const currentPosts = posts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-[1200px] mx-auto min-h-screen flex flex-col">
            {/* Header Area */}
            <div className="py-6 px-6 pb-0 bg-white sticky top-0 z-10 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 m-0">Community Posts</h1>

                    <div className="flex flex-1 md:max-w-md gap-3">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search updates, topics..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-2 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-[13px] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative shrink-0">
                            <select
                                value={filters.sortBy}
                                onChange={handleSortChange}
                                className="appearance-none py-2 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-600 cursor-pointer font-medium outline-none hover:border-gray-300"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="title_asc">Title A-Z</option>
                                <option value="title_desc">Title Z-A</option>
                            </select>
                            <ArrowUpDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Categories - Horizontal Scroll */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none touch-pan-x no-scrollbar">
                    <button
                        onClick={() => handleCategorySelect('')}
                        className={`py-2 px-4 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-all flex-shrink-0 ${filters.category === '' ? 'border border-teal-500 bg-teal-50 text-teal-500' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        All Updates
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
                            className={`py-2 px-4 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-all flex-shrink-0 ${filters.category === cat.id ? 'border border-teal-500 bg-teal-50 text-teal-500' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 bg-gray-50">
                {loading || (user?.email && userAccess.loading) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
                                <div className="aspect-video bg-gray-200" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                                    <div className="h-4 bg-gray-200 rounded w-full" />
                                    <div className="flex justify-between items-center pt-4">
                                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-5xl mb-4 text-gray-400">🔍</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No posts found</h3>
                        <p className="text-gray-500 text-center max-w-md">
                            {filters.category
                                ? 'No posts available in this category yet. Check back later!'
                                : 'No posts available yet. Check back later for updates!'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentPosts.map(post => (
                                <StudentPostCard
                                    key={post.id}
                                    post={post}
                                    onTagClick={handleTagClick}
                                />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 py-4">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'hover:bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

const StudentPosts = () => {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-[50vh]">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        }>
            <StudentPostsContent />
        </Suspense>
    );
};

export default StudentPosts;
