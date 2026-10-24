import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';
import { ShoppingCart, Tag, Search, X, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

const StudentStore = () => {
    const navigate = useNavigate();
    const { products, fetchProducts, loading: productsLoading } = useProducts();
    const { categories, fetchCategories, loading: categoriesLoading } = useProductCategories();
    const { addToCart, isInCart, openCart, cartCount } = useCart();

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    useEffect(() => {
        // Only show active products to students
        let result = products.filter(product => product.is_active !== false);

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
        <div className="student-store-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="student-store-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1a1a1a' }}>
                            Store
                        </h2>
                        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                            Browse and purchase courses to enhance your skills.
                        </p>
                    </div>

                    <button
                        onClick={openCart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                    >
                        <ShoppingCart size={18} />
                        <span>View Cart ({cartCount})</span>
                    </button>
                </div>

                {/* Search and Filter Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Search Bar */}
                    <div className="student-store-search-wrap" style={{ position: 'relative', maxWidth: '500px' }}>
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
                <div className="student-store-empty" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
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
                <div className="student-store-grid">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="student-store-card"
                            onClick={() => navigate(`/student/store/product/${product.id}`)}
                        >
                            {/* Image Header / Thumbnail */}
                            <div className="student-store-thumb">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                    />
                                ) : (
                                    <div className="student-store-thumb-placeholder">
                                        <ShoppingCart size={32} />
                                    </div>
                                )}

                                {/* Category Badge */}
                                {product.category && (
                                    <div className="student-store-category-badge">
                                        <Tag size={11} /> {product.category}
                                    </div>
                                )}
                            </div>

                            {/* Content Body */}
                            <div className="student-store-body">
                                <div>
                                    <h3 className="student-store-title">
                                        {product.title}
                                    </h3>
                                    {product.short_description ? (
                                        <p className="student-store-desc">
                                            {product.short_description}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="student-store-footer">
                                    {/* Price & Discounts */}
                                    <div className="student-store-price-box">
                                        <span className="student-store-price">
                                            {product.price > 0 ? `₹${product.price}` : 'Free'}
                                        </span>
                                        {product.strikethrough_price && (
                                            <span className="student-store-strike">
                                                ₹{product.strikethrough_price}
                                            </span>
                                        )}
                                        {product.strikethrough_price && product.price > 0 && product.strikethrough_price > product.price && (
                                            <span className="student-store-discount">
                                                {Math.round(((product.strikethrough_price - product.price) / product.strikethrough_price) * 100)}% off
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="student-store-actions">
                                        <button
                                            className={`student-store-btn-cart ${isInCart(product.id) ? 'in-cart' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isInCart(product.id)) {
                                                    openCart();
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                        >
                                            {isInCart(product.id) ? <Check size={14} /> : <ShoppingCart size={14} />}
                                            <span>{isInCart(product.id) ? 'In Cart' : 'Add to Cart'}</span>
                                        </button>

                                        <button
                                            className="student-store-btn-details"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/student/store/product/${product.id}`);
                                            }}
                                        >
                                            <span>View Details</span>
                                        </button>
                                    </div>
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
