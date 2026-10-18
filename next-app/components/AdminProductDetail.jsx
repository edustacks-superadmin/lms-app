'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Plus, MoreVertical, Package, ChevronDown } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useUsers } from '../context/UserContext';
import RecordCashPaymentModal from './RecordCashPaymentModal';

const AdminProductDetail = ({ productId }) => {
    const id = productId;
    const router = useRouter();
    const { getProductById, loading } = useProducts();
    const [product, setProduct] = useState(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const { users } = useUsers();
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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
        return (
            <div className="flex items-center justify-center p-10 h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/store')}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-slate-600"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                        {product.title}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => router.push(`/admin/store/edit/${id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        <Edit size={16} />
                        Edit Package
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
                        >
                            <Plus size={16} />
                            Add Content
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showAddMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                                    <div className="py-1">
                                        {['Add Existing Exams', 'Add New Exam', 'Excel Add New Exams'].map((item) => (
                                            <button
                                                key={item}
                                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2"
                                                onClick={() => setShowAddMenu(false)}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMoreMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                                    <div className="py-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {['Analytics', 'Extended Analytics', 'Send Email', 'Comments', 'Record Cash Payment', 'Offers', 'Extend Validity', 'Installment Plans', 'Subscription Plans'].map((item) => (
                                            <button
                                                key={item}
                                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    if (item === 'Record Cash Payment') {
                                                        setShowPaymentModal(true);
                                                    }
                                                    setShowMoreMenu(false);
                                                }}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Image */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-auto rounded-xl object-cover aspect-video"
                            />
                        ) : (
                            <div className="w-full aspect-video bg-blue-600 text-white rounded-xl flex flex-col items-center justify-center p-6 gap-4">
                                <Package size={64} className="opacity-80" />
                                <div className="text-xl font-bold text-center opacity-90">
                                    {product.title}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Info */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-gray-100 pb-4">Product Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Series Starts On</label>
                                <div className="text-slate-900 font-medium">{product.start_date || 'Not Scheduled'}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Series Ends On</label>
                                <div className="text-slate-900 font-medium">{product.end_date || 'Not Scheduled'}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price</label>
                                <div className="text-slate-900 font-bold text-lg">₹{product.price}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Child Product</label>
                                <div className="text-slate-900 font-medium">{product.parent_product_id || 'None'}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No. Exams</label>
                                <div className="text-slate-900 font-medium">0</div>
                            </div>
                        </div>

                        {product.short_description && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                                <div className="text-slate-700 leading-relaxed text-sm">
                                    {product.short_description}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <RecordCashPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                product={product}
                users={users}
            />
        </div>
    );
};

export default AdminProductDetail;
