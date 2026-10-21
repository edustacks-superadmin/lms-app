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
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px'
                }}>
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #e5e7eb',
                                transition: 'all 0.25s ease',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}
                            onClick={() => navigate(`/student/store/product/${product.id}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                        >
                            {/* Image Header */}
                            <div style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                overflow: 'hidden',
                                backgroundColor: '#f3f4f6',
                                position: 'relative'
                            }}>
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                        <ShoppingCart size={36} />
                                    </div>
                                )}

                                {/* Category Badge */}
                                {product.category && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(4px)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                                    }}>
                                        <Tag size={12} /> {product.category}
                                    </div>
                                )}
                            </div>

                            {/* Content Body */}
                            <div style={{
                                padding: '16px',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        marginBottom: '6px',
                                        color: '#0f172a',
                                        lineHeight: '1.4',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        minHeight: '44px'
                                    }}>
                                        {product.title}
                                    </h3>
                                    {product.short_description ? (
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#64748b',
                                            lineHeight: '1.4',
                                            marginBottom: '12px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {product.short_description}
                                        </p>
                                    ) : (
                                        <div style={{ height: '8px' }} />
                                    )}
                                </div>

                                <div>
                                    {/* Price & Discounts */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '8px',
                                        marginBottom: '14px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #f1f5f9'
                                    }}>
                                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                            {product.price > 0 ? `₹${product.price}` : 'Free'}
                                        </span>
                                        {product.strikethrough_price && (
                                            <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                ₹{product.strikethrough_price}
                                            </span>
                                        )}
                                        {product.strikethrough_price && product.price > 0 && product.strikethrough_price > product.price && (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: '#16a34a',
                                                backgroundColor: '#dcfce7',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                {Math.round(((product.strikethrough_price - product.price) / product.strikethrough_price) * 100)}% off
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isInCart(product.id)) {
                                                    openCart();
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                            style={{
                                                padding: '9px 8px',
                                                backgroundColor: isInCart(product.id) ? '#ecfdf5' : '#eff6ff',
                                                border: `1px solid ${isInCart(product.id) ? '#10b981' : '#bfdbfe'}`,
                                                borderRadius: '8px',
                                                color: isInCart(product.id) ? '#059669' : '#2563eb',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {isInCart(product.id) ? <Check size={14} /> : <ShoppingCart size={14} />}
                                            {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/student/store/product/${product.id}`);
                                            }}
                                            style={{
                                                padding: '9px 8px',
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                color: '#334155',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                e.currentTarget.style.color = '#0f172a';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                                e.currentTarget.style.color = '#334155';
                                            }}
                                        >
                                            View Details
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
