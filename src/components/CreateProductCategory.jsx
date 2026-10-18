import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProductCategories } from '../context/ProductCategoryContext';

const CreateProductCategory = () => {
    const navigate = useNavigate();
    const { addCategory } = useProductCategories();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#0055aa'
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const result = await addCategory(formData);

        if (result.success) {
            navigate('/store/categories');
        } else {
            setError(result.error);
        }
        setSubmitting(false);
    };

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button
                    onClick={() => navigate('/store/categories')}
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
                    Create Category
                </h1>
            </div>

            <form onSubmit={handleSubmit} style={{ maxWidth: '800px', paddingBottom: '40px' }}>
                {error && (
                    <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '4px' }}>
                        {error}
                    </div>
                )}

                {/* Category Name */}
                <div style={{ display: 'flex', marginBottom: '24px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>
                        Category Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            maxWidth: '600px'
                        }}
                        placeholder="e.g., 538, 400, 543"
                    />
                </div>

                {/* Description */}
                <div style={{ display: 'flex', marginBottom: '24px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '10px' }}>
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            maxWidth: '600px',
                            minHeight: '100px',
                            resize: 'vertical'
                        }}
                        placeholder="Optional description"
                    />
                </div>

                {/* Color */}
                <div style={{ display: 'flex', marginBottom: '24px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>
                        Color
                    </label>
                    <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        style={{
                            width: '600px',
                            height: '40px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginLeft: '200px' }}>
                    <button
                        type="submit"
                        className="btn btn-success"
                        style={{ padding: '10px 24px', fontSize: '16px' }}
                        disabled={submitting}
                    >
                        {submitting ? 'Creating...' : 'Create'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/store/categories')}
                        className="btn"
                        style={{ padding: '10px 24px', fontSize: '16px', backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc' }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProductCategory;
