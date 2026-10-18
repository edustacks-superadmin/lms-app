'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useProductCategories } from '../context/ProductCategoryContext';

const CreateProductCategory = () => {
    const router = useRouter();
    const { addCategory } = useProductCategories();
    const [formData, setFormData] = useState({
        name: ''
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const result = await addCategory(formData);

        if (result.success) {
            router.push('/admin/store/categories');
        } else {
            setError(result.error);
        }
        setSubmitting(false);
    };

    return (
        <div className="flex-1 w-full max-w-5xl mx-auto mt-6 px-4 sm:px-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push('/admin/store/categories')}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">
                    Create Category
                </h1>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Category Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                            placeholder="e.g., Electronics, Books, Courses"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-500/30 font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Creating...' : 'Create Category'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/store/categories')}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProductCategory;
