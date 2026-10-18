import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';
import { ShoppingCart, Tag, Search, X } from 'lucide-react';

const StudentStore = () => {
    const navigate = useNavigate();
    const { products, fetchProducts, loading: productsLoading } = useProducts();
    const { categories, fetchCategories, loading: categoriesLoading } = useProductCategories();

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    useEffect(() => {
        let result = products;

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter(product => product.category_id === selectedCategory);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(product =>
                product.title.toLowerCase().includes(query) ||
                (product.short_description && product.short_description.toLowerCase().includes(query))
            );
        }

        setFilteredProducts(result);
    }, [products, selectedCategory, searchQuery]);

    const loading = productsLoading || categoriesLoading;

    if (loading && products.length === 0) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading store...</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#1a1a1a' }}>
                    Store
                </h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                    Browse and purchase courses to enhance your skills.
                </p>

                {/* Search and Filter Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', maxWidth: '500px' }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                        }}>
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                paddingRight: searchQuery ? '40px' : '12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary-color)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Category Pills */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none', // Firefox
                        msOverflowStyle: 'none' // IE/Edge
                    }}>
                        <style>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: selectedCategory === 'all' ? 'none' : '1px solid #e5e7eb',
                                backgroundColor: selectedCategory === 'all' ? 'var(--primary-color)' : 'white',
                                color: selectedCategory === 'all' ? 'white' : '#4b5563',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            All
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: selectedCategory === category.id ? 'none' : '1px solid #e5e7eb',
                                    backgroundColor: selectedCategory === category.id ? 'var(--primary-color)' : 'white',
                                    color: selectedCategory === category.id ? 'white' : '#4b5563',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                    <ShoppingCart size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>No products found</h3>
                    <p style={{ color: '#6b7280' }}>
                        {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters'}
                    </p>
                    {(searchQuery || selectedCategory !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            style={{
                                marginTop: '16px',
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                color: '#374151',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #e5e7eb',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'row',
                                height: '100px'
                            }}
                            onClick={() => navigate(`/student/store/product/${product.id}`)}
                            onMouseOver={(e) => {
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Image */}
                            <div style={{ aspectRatio: '16/9', height: '100%', overflow: 'hidden', backgroundColor: '#f3f4f6', position: 'relative' }}>
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                        <ShoppingCart size={32} />
                                    </div>
                                )}
                                {product.category && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <Tag size={10} /> {product.category}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        marginBottom: '4px',
                                        color: '#1a1a1a',
                                        lineHeight: '1.3',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {product.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginBottom: '4px',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {product.short_description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {product.strikethrough_price && (
                                        <span style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through', marginRight: '6px' }}>
                                            ₹{product.strikethrough_price}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>
                                        {product.price > 0 ? `₹${product.price}` : 'Free'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentStore;
