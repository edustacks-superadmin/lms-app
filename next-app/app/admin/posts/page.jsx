'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import PostsSidebar from '../../../components/PostsSidebar';
import PostList from '../../../components/PostList';
import { usePosts } from '../../../context/PostContext';
import { useInstitute } from '../../../context/InstituteContext';

const PostsPage = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive status directly from pathname to avoid effect race conditions
    const activeStatus = pathname === '/admin/posts/deleted' ? 'deleted' : 'published';

    // Initialize filters from URL to persist state on reload
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        accessControl: searchParams.get('access_control') || '',
        featured: searchParams.get('featured') || '',
        category: searchParams.get('category') || '',
        dateFrom: searchParams.get('dateFrom') || '',
        dateTo: searchParams.get('dateTo') || '',
        sortBy: searchParams.get('sort_by') || 'newest',
        tags: searchParams.get('tags') ? searchParams.get('tags').split(',') : []
    });

    const { fetchPosts } = usePosts();
    const { institute } = useInstitute();

    // Fetch posts on mount
    useEffect(() => {
        if (institute?.id) {
            // Context initialization if needed
        }
    }, [institute?.id]);

    // Sync filters with URL (handles browser navigation and updates from child components)
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            status: searchParams.get('status') || '',
            accessControl: searchParams.get('access_control') || '',
            featured: searchParams.get('featured') || '',
            category: searchParams.get('category') || '',
            dateFrom: searchParams.get('dateFrom') || '',
            dateTo: searchParams.get('dateTo') || '',
            sortBy: searchParams.get('sort_by') || 'newest',
            tags: searchParams.get('tags') ? searchParams.get('tags').split(',') : []
        }));
    }, [searchParams]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);

        // Update URL with new filters
        const params = new URLSearchParams(searchParams);

        if (newFilters.status) params.set('status', newFilters.status);
        else params.delete('status');

        if (newFilters.accessControl) params.set('access_control', newFilters.accessControl);
        else params.delete('access_control');

        if (newFilters.featured) params.set('featured', newFilters.featured);
        else params.delete('featured');

        if (newFilters.category) params.set('category', newFilters.category);
        else params.delete('category');

        if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
        else params.delete('dateFrom');

        if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
        else params.delete('dateTo');

        if (newFilters.sortBy) params.set('sort_by', newFilters.sortBy);
        else params.delete('sort_by');

        if (newFilters.tags && newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
        else params.delete('tags');

        // Reset to page 1 on filter change
        params.set('page', '1');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleStatusChange = (status) => {
        // Status changes are route changes
        if (status === 'deleted') {
            router.push('/admin/posts/deleted');
        } else {
            router.push('/admin/posts');
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <PostsSidebar
                    onFilterChange={handleFilterChange}
                    activeStatus={activeStatus}
                    onStatusChange={handleStatusChange}
                />
                <main className="lg:ml-64 p-8">
                    <PostList
                        activeStatus={activeStatus}
                        filters={filters}
                    />
                </main>
            </div>
        </AdminLayout>
    );
};

export default PostsPage;
