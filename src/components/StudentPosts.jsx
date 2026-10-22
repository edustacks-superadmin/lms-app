import React, { useState, useEffect } from 'react';
import { Filter, ArrowUpDown, X } from 'lucide-react';
import PostList from './PostList';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const StudentPosts = () => {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest'
    });
    const [userAccess, setUserAccess] = useState({
        batches: [],
        products: [],
        loading: true
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (user?.email) {
            fetchUserAccess();
        }
    }, [user]);

    const fetchCategories = async () => {
        try {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const slug = parts.length > 2 ? parts[0].toLowerCase() : 'maheshiesacademy';
            const { data: instData } = await supabase
                .from('institute_settings')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();

            let query = supabase
                .from('categories')
                .select('id, name')
                .order('name');

            if (instData?.id) {
                query = query.eq('institute_id', instData.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchUserAccess = async () => {
        try {
            // 1. Get Member ID
            const { data: member } = await supabase
                .from('members')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!member) {
                setUserAccess(prev => ({ ...prev, loading: false }));
                return;
            }

            // 2. Get Batches
            const { data: batchMembers } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', member.id);

            const batchIds = batchMembers?.map(bm => bm.batch_id) || [];

            // 3. Get Purchased Products (Completed Orders)
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

    const handleCategoryChange = (e) => {
        setFilters(prev => ({ ...prev, category: e.target.value }));
    };

    const handleSortChange = (e) => {
        setFilters(prev => ({ ...prev, sortBy: e.target.value }));
    };

    const handleResetFilters = () => {
        setFilters({
            category: '',
            dateFrom: '',
            dateTo: '',
            sortBy: 'newest'
        });
    };

    return (
        <div className="student-posts-page">
            {/* Top Bar with Title and Horizontal Filters */}
            <div className="student-posts-topbar">
                <div>
                    <h1 className="student-posts-title">Posts</h1>
                    <p className="student-posts-subtitle">Updates, notices and announcements</p>
                </div>

                <div className="student-posts-filters-group">
                    <div className="filter-select-wrapper">
                        <Filter size={15} className="filter-select-icon" />
                        <select
                            className="form-input filter-select-input"
                            value={filters.category}
                            onChange={handleCategoryChange}
                            aria-label="Filter by category"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-select-wrapper">
                        <ArrowUpDown size={15} className="filter-select-icon" />
                        <select
                            className="form-input filter-select-input"
                            value={filters.sortBy}
                            onChange={handleSortChange}
                            aria-label="Sort by"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title_asc">Title A-Z</option>
                            <option value="title_desc">Title Z-A</option>
                        </select>
                    </div>

                    {(filters.category || filters.sortBy !== 'newest') && (
                        <button
                            type="button"
                            className="filter-reset-btn"
                            onClick={handleResetFilters}
                            title="Reset filters"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="student-posts-content">
                <PostList
                    activeStatus="published"
                    filters={filters}
                    readOnly={true}
                    userAccess={userAccess}
                    hideHeaderTitle={true}
                />
            </div>
        </div>
    );
};

export default StudentPosts;
