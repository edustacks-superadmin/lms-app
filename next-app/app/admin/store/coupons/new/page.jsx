'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Search } from 'lucide-react';

const CreateCouponPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');

    const searchParams = useSearchParams();

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percent',
        discount_value: '',
        start_date: '',
        end_date: '',
        max_uses: '',
        per_user_limit: 1,
        min_order_value: '',
        influencer_name: searchParams.get('influencer_name') || '',
        influencer_email: searchParams.get('influencer_email') || '',
        commission_percent: '',
        is_renewal_offer: false,
        applicable_products: []
    });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products?instituteId=10&limit=100');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProducts(data);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            }
        };
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/store/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/admin/store/coupons');
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Failed to create coupon'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (productId) => {
        setFormData(prev => {
            const current = prev.applicable_products;
            if (current.includes(productId)) {
                return { ...prev, applicable_products: current.filter(id => id !== productId) };
            } else {
                return { ...prev, applicable_products: [...current, productId] };
            }
        });
    };

    const filteredProducts = products.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[800px] mx-auto p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 border-none bg-transparent cursor-pointer text-gray-500 mb-5 hover:text-gray-700"
                >
                    <ArrowLeft size={16} /> Back to Coupons
                </button>

                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Coupon</h1>

                    <form onSubmit={handleSubmit}>
                        {/* Basic Info */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Coupon Code</label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. SUMMER25"
                                className="w-full p-2.5 rounded-md border border-gray-300 text-sm uppercase font-bold tracking-wider"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Type</label>
                                <select
                                    value={formData.discount_type}
                                    onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                >
                                    <option value="percent">Percentage (%)</option>
                                    <option value="flat">Flat Amount (₹)</option>
                                </select>
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Value</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.discount_value}
                                    onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                    placeholder={formData.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'}
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                />
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                />
                            </div>
                        </div>

                        {/* Advanced Constraints */}
                        <div className="text-base font-semibold text-gray-900 mb-4 mt-6 border-b border-gray-200 pb-2">Usage Limits & Constraints</div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Total Uses (Optional)</label>
                                <input
                                    type="number"
                                    value={formData.max_uses}
                                    onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                    placeholder="Total global redemptions"
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                />
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Limit Per User</label>
                                <input
                                    type="number"
                                    value={formData.per_user_limit}
                                    onChange={e => setFormData({ ...formData, per_user_limit: e.target.value })}
                                    placeholder="Default: 1"
                                    className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                                />
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Order Value (₹)</label>
                            <input
                                type="number"
                                value={formData.min_order_value}
                                onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                                placeholder="e.g. 1000"
                                className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                            />
                        </div>

                        <div className="mb-5">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.is_renewal_offer}
                                    onChange={e => setFormData({ ...formData, is_renewal_offer: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                Renewal / Repurchase Offer
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                                If checked, this coupon will ONLY work for users who have previously purchased/enrolled in the selected product(s) and are expired.
                            </p>
                        </div>

                        <div className="text-base font-semibold text-gray-900 mb-4 mt-6 border-b border-gray-200 pb-2">Influencer Tracking details</div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Influencer Name / Tag</label>
                            <input
                                type="text"
                                value={formData.influencer_name}
                                onChange={e => setFormData({ ...formData, influencer_name: e.target.value })}
                                placeholder="e.g. YoutubeStar Name"
                                className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use this to track sales generated by specific partners.</p>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Influencer Account Email</label>
                            <input
                                type="email"
                                value={formData.influencer_email || ''}
                                onChange={e => setFormData({ ...formData, influencer_email: e.target.value })}
                                placeholder="e.g. influencer@example.com"
                                className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter their registered email to link this coupon to their Partner Dashboard.</p>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission Percentage (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.commission_percent || ''}
                                onChange={e => setFormData({ ...formData, commission_percent: e.target.value })}
                                placeholder="e.g. 10"
                                className="w-full p-2.5 rounded-md border border-gray-300 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Percentage of the final order amount to pay to the influencer.</p>
                        </div>

                        {/* Product Applicability */}
                        <div className="text-base font-semibold text-gray-900 mb-4 mt-6 border-b border-gray-200 pb-2">Applicable Products</div>
                        <div className="mb-5">
                            <div className="relative mb-3">
                                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    className="w-full p-2.5 pl-8 rounded-md border border-gray-300 text-sm"
                                />
                            </div>

                            <div className="border border-gray-200 rounded-lg max-h-[300px] overflow-y-auto">
                                {filteredProducts.map(product => (
                                    <label
                                        key={product.id}
                                        className={`flex items-center gap-3 p-3 border-b border-gray-100 cursor-pointer ${formData.applicable_products.includes(product.id) ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.applicable_products.includes(product.id)}
                                            onChange={() => toggleProduct(product.id)}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                            <div className="text-xs text-gray-500">₹{product.price}</div>
                                        </div>
                                    </label>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="p-5 text-center text-gray-400 text-sm">
                                        No products found
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Selected: {formData.applicable_products.length} products. (Leave empty to apply to ALL products)
                            </p>
                        </div>

                        {/* Submit */}
                        <div className="mt-8 flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 p-3 rounded-md border border-gray-300 bg-white text-gray-700 cursor-pointer font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] flex items-center justify-center gap-2 p-3 rounded-md border-none bg-[var(--primary-color)] text-white cursor-pointer font-medium disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                            >
                                <Save size={18} /> {loading ? 'Creating...' : 'Create Coupon'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCouponPage;
