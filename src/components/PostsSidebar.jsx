import React, { useState, useEffect } from 'react';
import { List, CheckCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PostsSidebar = ({ onFilterChange, activeStatus, onStatusChange, isStudent = false }) => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest'
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
    };

    const handleSubmit = () => {
        onFilterChange(filters);
    };

    return (
        <aside className="posts-sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!isStudent && (
                    <>
                        <button
                            className="btn"
                            style={{ justifyContent: 'center', width: '100%', marginBottom: '16px', backgroundColor: '#00bfa5', color: 'white', border: 'none', cursor: 'pointer' }}
                            onClick={() => navigate('/posts/create')}
                        >
                            <List size={18} /> Create post
                        </button>

                        <button
                            className="btn"
                            style={{
                                justifyContent: 'flex-start',
                                width: '100%',
                                backgroundColor: activeStatus === 'published' ? '#2196f3' : 'transparent',
                                color: activeStatus === 'published' ? 'white' : 'var(--primary-color)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/posts')}
                        >
                            <CheckCircle size={16} /> Published
                        </button>
                        <button
                            className="btn"
                            style={{
                                justifyContent: 'flex-start',
                                width: '100%',
                                backgroundColor: activeStatus === 'deleted' ? '#2196f3' : 'transparent',
                                color: activeStatus === 'deleted' ? 'white' : 'var(--primary-color)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate('/posts/deleted')}
                        >
                            <Trash2 size={16} /> Deleted
                        </button>
                    </>
                )}
            </div>

            <div style={{ marginTop: '24px' }}>
                <label style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px', display: 'block' }}>Filter by category</label>
                <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>



            <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px', display: 'block' }}>Sort by</label>
                <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title_asc">Title A-Z</option>
                    <option value="title_desc">Title Z-A</option>
                </select>
            </div>

            <button
                className="btn btn-primary"
                style={{ marginTop: '20px', width: '100%' }}
                onClick={handleSubmit}
            >
                Apply Filters
            </button>
        </aside>
    );
};

export default PostsSidebar;
