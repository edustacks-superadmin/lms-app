'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ShoppingCart, Tag, Search, X, Plus, Check } from 'lucide-react';

const StudentStore = () => {
    const router = useRouter();
    const { products, fetchProducts, loading: productsLoading } = useProducts();
    const { categories, fetchCategories, loading: categoriesLoading } = useProductCategories();
    const { addToCart, isInCart } = useCart();
    const { showToast } = useToast();

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [addingToId, setAddingToId] = useState(null);

    const handleAddToCart = async (e, product) => {
        e.stopPropagation();
        setAddingToId(product.id);
        try {
            const res = await addToCart(product);
            if (res.success) {
                showToast('Added to cart!', 'success');
            } else {
                showToast(res.details || res.message || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            showToast('Something went wrong', 'error');
        } finally {
            setAddingToId(null);
        }
    };

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
        <div className="px-5 py-6 md:px-8 md:py-10 max-w-[1200px] mx-auto min-h-screen">
            <div style={{
                marginBottom: '32px',
                paddingBottom: '20px',
                borderBottom: '1px solid #f1f5f9'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ShoppingCart size={24} color="#2563eb" />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#0f172a',
                            margin: 0,
                            lineHeight: '1.2'
                        }}>
                            Store
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            color: '#3b82f6',
                            margin: 0,
                            fontWeight: '600'
                        }}>
                            Upgrade your skills today
                        </p>
                    </div>
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
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    border: '1px solid #eef2f7',
                    overflow: 'hidden'
                }}>
                    {filteredProducts.map((product, index) => (
                        <React.Fragment key={product.id}>
                            <div
                                style={{
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '16px',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onClick={() => router.push(`/student/store/product/${product.id}`)}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {/* Image Container */}
                                <div style={{
                                    width: '120px',
                                    aspectRatio: '16/9',
                                    flexShrink: 0,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    backgroundColor: '#f1f5f9',
                                    position: 'relative'
                                }}>
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                            <ShoppingCart size={24} />
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
                                            gap: '4px',
                                            zIndex: 10
                                        }}>
                                            <Tag size={10} /> {product.category}
                                        </div>
                                    )}
                                    {/* Product Tags (e.g., Bestseller) overlay */}
                                    {product.product_tags && product.product_tags.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            left: '8px',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '4px',
                                            zIndex: 10
                                        }}>
                                            {product.product_tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    style={{
                                                        fontSize: '10px',
                                                        fontWeight: '700',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        backgroundColor: tag.color ? tag.color : '#f3f4f6',
                                                        color: 'white',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    minWidth: 0 // For text truncation
                                }}>
                                    <h3 style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        marginBottom: '2px',
                                        color: '#0f172a',
                                        lineHeight: '1.4',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {product.title}
                                    </h3>
                                    {product.short_description && (
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#64748b',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            margin: 0
                                        }}>
                                            {product.short_description}
                                        </p>
                                    )}
                                </div>

                                {/* Price and Action */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {product.price > 0 ? (
                                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                                ₹{product.price}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>
                                                Free
                                            </span>
                                        )}
                                    </div>

                                    {/* Add to Cart Button */}
                                    <button
                                        onClick={(e) => handleAddToCart(e, product)}
                                        disabled={addingToId === product.id || isInCart(product.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: isInCart(product.id) ? '#f1f5f9' : 'rgba(37, 99, 235, 0.08)',
                                            color: isInCart(product.id) ? '#94a3b8' : 'var(--primary-color)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: isInCart(product.id) ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s',
                                            pointerEvents: addingToId === product.id ? 'none' : 'auto'
                                        }}
                                    >
                                        {addingToId === product.id ? (
                                            '...'
                                        ) : isInCart(product.id) ? (
                                            <><Check size={14} /> In Cart</>
                                        ) : (
                                            <><Plus size={14} /> Add</>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {index < filteredProducts.length - 1 && (
                                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0 16px' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentStore;
