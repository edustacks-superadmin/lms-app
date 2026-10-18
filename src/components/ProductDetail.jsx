import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, MoreVertical, Package } from 'lucide-react';
import { useProducts } from '../context/ProductContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getProductById, loading } = useProducts();
    const [product, setProduct] = useState(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    useEffect(() => {
        const loadProduct = async () => {
            const result = await getProductById(id);
            if (result.success) {
                setProduct(result.data);
            }
        };
        loadProduct();
    }, [id]);

    if (loading || !product) {
        return <div style={{ flex: 1, padding: '20px' }}>Loading...</div>;
    }

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
                            justifyContent: 'center'
                        }}
                    >
                        <ArrowLeft size={24} color="#333" />
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                        {product.title}
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate(`/store/product/${id}/edit`)}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Edit size={16} />
                        Edit Package
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="btn btn-success"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                        >
                            <Plus size={16} />
                            Add
                        </button>

                        {showAddMenu && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                background: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: '200px'
                            }}>
                                {['Add Existing Exams', 'Add New Exam', 'Excel Add New Exams'].map((item) => (
                                    <button
                                        key={item}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="btn btn-outline"
                            style={{ padding: '8px 12px' }}
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showMoreMenu && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                background: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: '200px'
                            }}>
                                {['Analytics', 'Extended Analytics', 'Send Email', 'Comments', 'Record Cash Payment', 'Offers', 'Extend Validity', 'Installment Plans', 'Subscription Plans'].map((item) => (
                                    <button
                                        key={item}
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
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Details */}
            <div style={{ display: 'flex', gap: '30px' }}>
                {/* Product Image */}
                <div style={{ flex: '0 0 300px' }}>
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.title}
                            style={{ width: '100%', borderRadius: '4px', border: '1px solid #e0e0e0' }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '200px',
                            backgroundColor: '#0055aa',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            gap: '10px'
                        }}>
                            <Package size={64} color="#fff" />
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {product.title}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div style={{ flex: 1 }}>
                    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', fontSize: '14px' }}>
                            <div style={{ color: '#666' }}>Series Starts on:</div>
                            <div>{product.start_date || 'None'}</div>

                            <div style={{ color: '#666' }}>Series Ends on:</div>
                            <div>{product.end_date || 'None'}</div>

                            <div style={{ color: '#666' }}>No. Exams:</div>
                            <div>0</div>

                            <div style={{ color: '#666' }}>Price:</div>
                            <div style={{ fontWeight: '500' }}>₹{product.price}</div>

                            <div style={{ color: '#666' }}>Child Product:</div>
                            <div>{product.parent_product_id || 'None'}</div>

                            {product.short_description && (
                                <>
                                    <div style={{ color: '#666' }}>Description:</div>
                                    <div>{product.short_description}</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
