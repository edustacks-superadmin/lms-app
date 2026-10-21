import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PostsSidebar from './PostsSidebar';
import PostList from './PostList';

const PostsPageWrapper = () => {
    const location = useLocation();
    const [activeStatus, setActiveStatus] = useState('published');
    const [filters, setFilters] = useState({
        category: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest'
    });

    // Set status based on URL
    useEffect(() => {
        if (location.pathname === '/admin/posts/deleted' || location.pathname === '/posts/deleted') {
            setActiveStatus('deleted');
        } else {
            setActiveStatus('published');
        }
    }, [location.pathname]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleStatusChange = (status) => {
        setActiveStatus(status);
    };

    return (
        <>
            <PostsSidebar
                onFilterChange={handleFilterChange}
                activeStatus={activeStatus}
                onStatusChange={handleStatusChange}
            />
            <div className="content-area">
                <PostList
                    activeStatus={activeStatus}
                    filters={filters}
                />
            </div>
        </>
    );
};

export default PostsPageWrapper;
