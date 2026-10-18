import React, { useState, useEffect } from 'react';
import PostsSidebar from './PostsSidebar';
import PostList from './PostList';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const StudentPosts = () => {
    const { user } = useAuth();
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
        if (user?.email) {
            fetchUserAccess();
        }
    }, [user]);

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
            // We need to check orders table. Assuming orders are linked by user_email or user_id.
            // TransactionContext uses user_email.
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

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    return (
        <div className="student-posts-container">
            <PostsSidebar
                onFilterChange={handleFilterChange}
                activeStatus="published"
                onStatusChange={() => { }} // No-op for students
                isStudent={true}
            />
            <div className="content-area">
                <PostList
                    activeStatus="published"
                    filters={filters}
                    readOnly={true}
                    userAccess={userAccess}
                />
            </div>
        </div>
    );
};

export default StudentPosts;
