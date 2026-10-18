'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Briefcase, Trash2, Edit, MapPin, Clock } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

export default function AdminCareersPage() {
    const router = useRouter();
    const { institute } = useInstitute();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/careers');
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching careers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this job posting?')) return;

        try {
            const response = await fetch(`/api/admin/careers/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setItems(items.filter(item => item.id !== id));
            } else {
                alert('Failed to delete job posting');
            }
        } catch (error) {
            console.error('Error deleting job posting:', error);
        }
    };

    const filteredItems = items.filter(item => {
        return item.title.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Careers Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage job openings and opportunities</p>
                </div>
                <button
                    onClick={() => router.push('/admin/careers/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Post New Job
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <Briefcase className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No job postings found</h3>
                    <p className="text-gray-500">Get started by posting a new job opportunity.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {item.is_active ? 'Active' : 'Closed'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <Briefcase size={16} />
                                        {item.type}
                                    </span>
                                    {item.location && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={16} />
                                            {item.location}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={16} />
                                        Posted {new Date(item.posted_date).toLocaleDateString()}
                                    </span>
                                </div>
                                {item.description && (
                                    <p className="text-gray-600 line-clamp-2 max-w-2xl">{item.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/admin/careers/edit/${item.id}`)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
