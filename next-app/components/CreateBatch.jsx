'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBatches } from '../context/BatchContext';
import { Save, X } from 'lucide-react';

const CreateBatch = ({ batchId }) => {
    const router = useRouter();
    const params = useParams();
    const id = batchId || params.id;
    const { addBatch, updateBatch, batches } = useBatches();
    const [batchName, setBatchName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id && batches.length > 0) {
            const batch = batches.find(b => b.id.toString() === id.toString());
            if (batch) {
                setBatchName(batch.name);
            }
        }
    }, [id, batches]);

    const handleSubmit = async () => {
        if (batchName.trim()) {
            setLoading(true);
            try {
                if (id) {
                    await updateBatch(id, { name: batchName });
                } else {
                    await addBatch({
                        name: batchName
                    });
                }
                router.push('/batches');
            } catch (error) {
                console.error('Error saving batch:', error);
                alert('Failed to save batch');
            } finally {
                setLoading(false);
            }
        } else {
            alert('Please fill in all fields');
        }
    };

    const handleCancel = () => {
        router.push('/batches');
    };

    const isEditMode = !!id;

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Tabs / Header - Removed as per user request (confusing UI) */}
            <div className="bg-white border-b border-slate-200 px-8 sticky top-0 z-10 hidden">
                {/* ... */}
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-5xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            {isEditMode ? 'Edit Batch' : 'Create New Batch'}
                        </h2>
                        <p className="text-slate-500">
                            {isEditMode ? 'Update existing batch details.' : 'Add a new batch to organize your users and courses.'}
                        </p>
                    </div>

                    <div className="max-w-md">
                        {/* Name Field */}
                        <div className="mb-6">
                            <label className="block font-medium text-slate-700 mb-2 text-sm">
                                Batch Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-400 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                                placeholder="e.g. Quick Revision Chart"
                                autoFocus
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : (isEditMode ? 'Update Batch' : 'Create Batch')}
                            </button>
                            <button
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBatch;
