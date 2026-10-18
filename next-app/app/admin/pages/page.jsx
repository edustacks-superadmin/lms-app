'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Trash2, Edit } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

export default function AdminPagesPage() {
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
            const response = await fetch('/api/admin/pages');
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this page?')) return;

        try {
            const response = await fetch(`/api/admin/pages/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setItems(items.filter(item => item.id !== id));
            } else {
                alert('Failed to delete page');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
        }
    };

    const filteredItems = items.filter(item => {
        return item.title.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pages Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage static pages like About Us, Terms, etc.</p>
                </div>
                <button
                    onClick={() => router.push('/admin/pages/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Create New Page
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search pages..."
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
                    <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No pages found</h3>
                    <p className="text-gray-500">Get started by creating a new page.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{item.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        /{item.slug}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {item.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {item.slug !== 'home' && ( // Prevent deleting home if we ever have one
                                                <>
                                                    <a href={`/${item.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100" title="View">
                                                        <FileText size={16} />
                                                    </a>
                                                    <button
                                                        onClick={() => router.push(`/admin/pages/edit/${item.id}`)}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-600 hover:text-red-800 rounded-md hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
