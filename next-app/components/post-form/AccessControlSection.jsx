import React from 'react';
import { Plus, X } from 'lucide-react';

const AccessControlSection = ({ formData, onAddProduct, onRemoveProduct, onAddBatch, onRemoveBatch, onChange, products, batches }) => {
    const isPublic = formData.accessControl === 'Public';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-t border-gray-100">
            {/* Products Selection */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Products (Access Control)</label>
                {isPublic ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm font-medium">
                        Available to all products (Public)
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <select
                                id="productSelect"
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    const select = document.getElementById('productSelect');
                                    if (select.value) onAddProduct(select.value);
                                    select.value = "";
                                }}
                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {formData.allowedProducts.map(productId => {
                                const product = products.find(p => p.id === productId);
                                return product ? (
                                    <span key={productId} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
                                        {product.title}
                                        <button onClick={() => onRemoveProduct(productId)} className="hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Access Control Dropdown */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Access Type</label>
                <select
                    name="accessControl"
                    value={formData.accessControl}
                    onChange={onChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                >
                    <option value="Private">Private</option>
                    <option value="Public">Public</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                    Public posts are visible to everyone. Private posts require product/batch enrollment.
                </p>
            </div>

            {/* Batches Selection */}
            <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Batches</label>
                {isPublic ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm font-medium">
                        Available to all batches (Public)
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <select
                                id="batchSelect"
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                            >
                                <option value="">Select a batch...</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    const select = document.getElementById('batchSelect');
                                    if (select.value) onAddBatch(select.value);
                                    select.value = "";
                                }}
                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {formData.selectedBatches.map(batchId => {
                                const batch = batches.find(b => b.id === batchId);
                                return batch ? (
                                    <span key={batchId} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700">
                                        {batch.name}
                                        <button onClick={() => onRemoveBatch(batchId)} className="hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessControlSection;
