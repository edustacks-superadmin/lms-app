import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';

const EditCategory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCategory, updateCategory, loading } = useCategories();

    const [category, setCategory] = useState({
        name: '',
        color: '#000000',
        isStarred: false,
        forForum: false
    });

    useEffect(() => {
        if (loading) return;

        const data = getCategory(id);

        if (data) {
            setCategory(data);
        }
    }, [id, getCategory, loading]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdate = () => {
        updateCategory(id, category);
        navigate('/posts/categories');
    };

    if (loading) return <div>Loading...</div>;
    if (!category.name) return <div>Category not found</div>;

    return (
        <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Edit - {category.name}
            </h2>

            <div style={{ maxWidth: '600px' }}>
                {/* Name */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '150px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Name:</label>
                    <input
                        type="text"
                        name="name"
                        value={category.name}
                        onChange={handleChange}
                        className="form-control"
                        style={{ flex: 1 }}
                    />
                </div>

                {/* Color */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '150px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Color:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="color"
                            name="color"
                            value={category.color}
                            onChange={handleChange}
                            style={{ width: '50px', height: '30px', padding: 0, border: '1px solid #ddd' }}
                        />
                    </div>
                </div>

                {/* Starred Category */}
                <div style={{ display: 'flex', marginBottom: '20px' }}>
                    <label style={{ width: '150px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', paddingTop: '3px' }}>Starred category:</label>
                    <div>
                        <input
                            type="checkbox"
                            name="isStarred"
                            checked={category.isStarred}
                            onChange={handleChange}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Enable to list this category in quick link</div>
                    </div>
                </div>

                {/* For Forum */}
                <div style={{ display: 'flex', marginBottom: '30px', alignItems: 'center' }}>
                    <label style={{ width: '150px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>For forum:</label>
                    <input
                        type="checkbox"
                        name="forForum"
                        checked={category.forForum}
                        onChange={handleChange}
                        style={{ transform: 'scale(1.2)' }}
                    />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginLeft: '170px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none' }}
                        onClick={handleUpdate}
                    >
                        Update category
                    </button>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: 'none' }}
                        onClick={() => navigate('/posts/categories')}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditCategory;
