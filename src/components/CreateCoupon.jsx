import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOffers } from '../context/OfferContext';
import { useProducts } from '../context/ProductContext';
import { ArrowLeft } from 'lucide-react';

const CreateCoupon = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { createOffer } = useOffers();
    const { products } = useProducts();

    const preselectedProduct = location.state?.selectedProductId;

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        start_date: '',
        end_date: '',
        applicable_products: preselectedProduct ? [preselectedProduct] : []
    });

    const [loading, setLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProductToggle = (productId) => {
        setFormData(prev => {
            const current = prev.applicable_products;
            if (current.includes(productId)) {
                return { ...prev, applicable_products: current.filter(id => id !== productId) };
            } else {
                return { ...prev, applicable_products: [...current, productId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const offerData = {
            type: 'coupon',
            code: formData.code,
            discount_type: formData.discount_type,
            discount_value: Number(formData.discount_value),
            start_date: formData.start_date,
            end_date: formData.end_date,
            applicable_products: formData.applicable_products,
            status: 'active'
        };

        const result = await createOffer(offerData);
        setLoading(false);

        if (result.success) {
            navigate('/store?status=offer');
        } else {
            alert('Error creating coupon: ' + result.error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: '24px', fontWeight: '500', margin: 0 }}>Create Coupon</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Coupon Code</label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        className="form-control"
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Discount Type</label>
                        <select
                            name="discount_type"
                            value={formData.discount_type}
                            onChange={handleChange}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Discount Value</label>
                        <input
                            type="number"
                            name="discount_value"
                            value={formData.discount_value}
                            onChange={handleChange}
                            required
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Start Date</label>
                        <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                            required
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>End Date</label>
                        <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleChange}
                            required
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Applicable Products</label>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '10px' }}
                    />
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '10px' }}>
                        {filteredProducts.map(product => (
                            <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.applicable_products.includes(product.id)}
                                    onChange={() => handleProductToggle(product.id)}
                                />
                                <span>{product.title}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Selected: {formData.applicable_products.length} products
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn"
                        style={{ padding: '10px 20px', border: '1px solid #ddd', background: 'white', borderRadius: '4px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCoupon;
