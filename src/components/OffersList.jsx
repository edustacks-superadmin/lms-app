import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffers } from '../context/OfferContext';
import { useProducts } from '../context/ProductContext';
import { Plus, Filter, Tag, Repeat, Trash2, Calendar } from 'lucide-react';

const OffersList = () => {
    const navigate = useNavigate();
    const { offers, loading, deleteOffer } = useOffers();
    const { products } = useProducts();
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);

    const getProductName = (id) => {
        const product = products.find(p => p.id === id);
        return product ? product.title : 'Unknown Product';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this offer?')) {
            await deleteOffer(id);
        }
    };

    if (loading) return <div>Loading offers...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '500', margin: 0 }}>Coupon Offers</h2>
                    <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                        Show results for <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Repeat purchase offers</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
                        <Filter size={18} /> Filter by products
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-color)', color: 'white' }}
                        >
                            Create Offer <Plus size={18} />
                        </button>
                        {showCreateDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'white',
                                border: '1px solid #eee',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: '200px'
                            }}>
                                <button
                                    onClick={() => navigate('/offers/create-coupon')}
                                    style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Create Coupon
                                </button>
                                <button
                                    onClick={() => navigate('/offers/create-repeat-offer')}
                                    style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Create Repeat Purchase
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {offers.length === 0 ? (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '60px',
                    textAlign: 'center',
                    border: '1px solid #eee',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No Offers Found</h3>
                    <p style={{ color: '#666' }}>
                        To create a coupon offer <span onClick={() => navigate('/offers/create-coupon')} style={{ color: 'var(--primary-color)', cursor: 'pointer' }}>click here</span>.
                        To create a repeat purchase offer <span onClick={() => navigate('/offers/create-repeat-offer')} style={{ color: 'var(--primary-color)', cursor: 'pointer' }}>click here</span>.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {offers.map(offer => (
                        <div key={offer.id} style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #eee',
                            padding: '20px',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{
                                    backgroundColor: offer.type === 'coupon' ? '#e3f2fd' : '#f3e5f5',
                                    color: offer.type === 'coupon' ? '#1976d2' : '#7b1fa2',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {offer.type === 'coupon' ? <Tag size={12} /> : <Repeat size={12} />}
                                    {offer.type === 'coupon' ? 'Coupon' : 'Repeat Offer'}
                                </div>
                                <button onClick={() => handleDelete(offer.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                {offer.type === 'coupon' ? offer.code : offer.name}
                            </h3>

                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '12px' }}>
                                {offer.discount_value}{offer.discount_type === 'percentage' ? '%' : '₹'} OFF
                            </div>

                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                                {offer.description || (offer.type === 'coupon' ? 'Discount Coupon' : 'Special Offer')}
                            </div>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', fontSize: '13px', color: '#666' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <Calendar size={14} />
                                    {formatDate(offer.start_date)} - {formatDate(offer.end_date)}
                                </div>
                                <div>
                                    <strong>Products: </strong>
                                    {offer.applicable_products && offer.applicable_products.length > 0
                                        ? offer.applicable_products.map(id => getProductName(id)).join(', ')
                                        : 'All Products'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OffersList;
