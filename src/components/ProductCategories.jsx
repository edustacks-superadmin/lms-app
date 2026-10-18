import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Plus } from 'lucide-react';
import { useProductCategories } from '../context/ProductCategoryContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ProductCategories = () => {
    const navigate = useNavigate();
    const { categories, fetchCategories, deleteCategory, loading } = useProductCategories();
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDeleteClick = (category) => {
        setDeleteModal({ isOpen: true, category });
        setOpenMenuId(null);
    };

    const handleDeleteConfirm = async () => {
        if (deleteModal.category) {
            await deleteCategory(deleteModal.category.id);
        }
    };



    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/store')}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                        <ArrowLeft size={24} color="#333" />
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                        Product Categories
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/store/categories/create')}
                    className="btn btn-success"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                    <Plus size={20} />
                    Create Category
                </button>
            </div>

            {/* Categories List */}
            {loading && <p>Loading categories...</p>}

            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                {categories.map((category, index) => (
                    <div
                        key={category.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: index < categories.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                                style={{
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    color: category.color || '#0055aa'
                                }}
                            >
                                {category.name}
                            </span>
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: '#666',
                                    backgroundColor: '#f5f5f5',
                                    padding: '2px 8px',
                                    borderRadius: '12px'
                                }}
                            >
                                {category.productCount}
                            </span>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <MoreVertical size={20} color="#666" />
                            </button>

                            {openMenuId === category.id && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        background: 'white',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        zIndex: 10,
                                        minWidth: '120px'
                                    }}
                                >
                                    <button
                                        onClick={() => navigate(`/store/categories/edit/${category.id}`)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(category)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#d32f2f'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#ffebee'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && categories.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        No categories found. Create your first category!
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Category"
                message="Are you sure you want to delete this category? All products in this category will need to be reassigned."
                itemName={deleteModal.category?.name}
                confirmText="Delete Category"
            />
        </div>
    );
};

export default ProductCategories;
