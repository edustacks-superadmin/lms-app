import React, { useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Tag, List } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProductCategories } from '../context/ProductCategoryContext';

const StoreSidebar = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { categories, fetchCategories } = useProductCategories();
    const currentCategory = searchParams.get('category') || '';
    const currentStatus = searchParams.get('status') || 'approved';

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleStatusChange = (status) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('status', status);
        setSearchParams(newParams);
    };

    const handleCategoryChange = (e) => {
        const categoryId = e.target.value;
        const newParams = new URLSearchParams(searchParams);
        if (categoryId) {
            newParams.set('category', categoryId);
        } else {
            newParams.delete('category');
        }
        setSearchParams(newParams);
    };

    const getButtonStyle = (status) => ({
        justifyContent: 'flex-start',
        width: '100%',
        color: currentStatus === status ? 'white' : 'var(--primary-color)',
        background: currentStatus === status ? 'var(--primary-color)' : 'transparent',
        fontWeight: currentStatus === status ? '500' : '400'
    });

    return (
        <aside style={{ width: '250px', flexShrink: 0, padding: '20px 16px 20px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    className="btn btn-success"
                    style={{ justifyContent: 'center', width: '100%', marginBottom: '16px' }}
                    onClick={() => navigate('/store/create')}
                >
                    <List size={18} /> Create a package
                </button>

                <button
                    className="btn"
                    style={getButtonStyle('draft')}
                    onClick={() => handleStatusChange('draft')}
                >
                    <FileText size={16} /> Drafts
                </button>
                <button
                    className="btn"
                    style={getButtonStyle('pending')}
                    onClick={() => handleStatusChange('pending')}
                >
                    <Clock size={16} /> Pending Approval
                </button>
                <button
                    className="btn"
                    style={getButtonStyle('approved')}
                    onClick={() => handleStatusChange('approved')}
                >
                    <CheckCircle size={16} /> Approved
                </button>
                <button
                    className="btn"
                    style={getButtonStyle('inactive')}
                    onClick={() => handleStatusChange('inactive')}
                >
                    <XCircle size={16} /> Inactive
                </button>
                <button
                    className="btn"
                    style={getButtonStyle('offer')}
                    onClick={() => handleStatusChange('offer')}
                >
                    <Tag size={16} /> Offer
                </button>
            </div>

            <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '12px' }}>Filter by category</h3>
                <div className="input-group">
                    <select
                        className="form-control"
                        value={currentCategory}
                        onChange={handleCategoryChange}
                        style={{ width: '100%' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.productCount})</option>
                        ))}
                    </select>
                </div>
            </div>
        </aside>
    );
};

export default StoreSidebar;
