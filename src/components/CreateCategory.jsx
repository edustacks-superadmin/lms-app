import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';

const CreateCategory = () => {
    const navigate = useNavigate();
    const { addCategory } = useCategories();

    const [category, setCategory] = useState({
        name: '',
        color: '#000000',
        isStarred: false,
        forForum: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreate = () => {
        if (!category.name) return; // Basic validation
        addCategory(category);
        navigate('/posts/categories');
    };

    return (
        <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Create category
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
                        onClick={handleCreate}
                    >
                        Create category
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

export default CreateCategory;
