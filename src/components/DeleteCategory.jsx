import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import { XCircle } from 'lucide-react';

const DeleteCategory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCategory, deleteCategory, loading } = useCategories();
    const [category, setCategory] = useState(null);

    useEffect(() => {
        if (loading) return;

        const data = getCategory(id);
        if (data) {
            setCategory(data);
        } else {
            // Handle case where category is not found (e.g., invalid ID)
            navigate('/posts/categories');
        }
    }, [id, getCategory, navigate, loading]);

    const handleDelete = () => {
        deleteCategory(id);
        navigate('/posts/categories');
    };

    if (!category) return <div>Loading...</div>;

    return (
        <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Delete - {category.name}
            </h2>

            <div style={{ maxWidth: '600px' }}>
                <p style={{ fontSize: '16px', marginBottom: '10px', color: '#333' }}>
                    Are you sure you want to delete the category {category.name}?
                </p>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
                    – Deleting a category will remove it from all posts
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc' }}
                        onClick={() => navigate('/posts/categories')}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={handleDelete}
                    >
                        <XCircle size={16} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCategory;
