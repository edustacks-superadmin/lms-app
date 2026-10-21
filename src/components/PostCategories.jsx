import React from 'react';
import { PlusCircle, Menu, Edit2, Trash2, Star, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';

const PostCategories = () => {
    const navigate = useNavigate();
    const { categories } = useCategories();

    return (
        <div style={{ flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '400', margin: 0 }}>Post Categories</h2>
                <button
                    className="btn"
                    style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => navigate('/admin/posts/categories/create')}
                >
                    <PlusCircle size={18} /> Create category
                </button>
            </div>

            {/* Category List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {categories.map((category) => (
                    <div key={category.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '20px 0',
                        borderBottom: '1px solid #eee',
                        gap: '20px'
                    }}>
                        {/* Drag Handle */}
                        <div style={{ color: '#999', cursor: 'grab' }}>
                            <Menu size={18} />
                        </div>

                        {/* Star (Conditional) */}
                        <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                            {category.isStarred && <Star size={16} fill="#666" color="#666" />}
                        </div>

                        {/* Tag */}
                        <div style={{ flex: 1 }}>
                            <span style={{
                                backgroundColor: category.color,
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'uppercase'
                            }}>
                                <Tag size={14} fill="white" /> {category.name}
                            </span>
                        </div>

                        {/* Post Count */}
                        <div style={{ width: '100px', color: 'var(--primary-color)', fontSize: '14px' }}>
                            {category.count} posts
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '30px', marginRight: '20px' }}>
                            <button
                                style={{ background: 'none', border: 'none', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}
                                onClick={() => navigate(`/admin/posts/categories/edit/${category.id}`)}
                            >
                                <Edit2 size={16} /> Edit
                            </button>
                            <button
                                style={{ background: 'none', border: 'none', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}
                                onClick={() => navigate(`/admin/posts/categories/delete/${category.id}`)}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PostCategories;
