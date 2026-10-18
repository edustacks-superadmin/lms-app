'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Image as ImageIcon, Video, Trash2, Edit, ExternalLink, MoreVertical } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

export default function AdminGalleryPage() {
    const router = useRouter();
    const { institute } = useInstitute();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/gallery');
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching gallery items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await fetch(`/api/admin/gallery/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setItems(items.filter(item => item.id !== id));
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gallery Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your photos and videos</p>
                </div>
                <button
                    onClick={() => router.push('/admin/gallery/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Add New Item
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search gallery..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType('image')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Photos
                    </button>
                    <button
                        onClick={() => setFilterType('video')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'video' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Videos
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <ImageIcon className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No items found</h3>
                    <p className="text-gray-500">Get started by creating a new gallery item.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                {item.type === 'image' ? (
                                    <img
                                        src={item.url}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full relative">
                                        {item.thumbnail_url ? (
                                            <img
                                                src={item.thumbnail_url}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                <Video className="text-gray-500" size={48} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm">
                                    <button
                                        onClick={() => router.push(`/admin/gallery/edit/${item.id}`)}
                                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-md hover:bg-blue-50"
                                        title="Edit"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-1.5 text-gray-600 hover:text-red-600 rounded-md hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute top-2 left-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.type === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.type === 'image' ? 'Photo' : 'Video'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                                {item.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                )}
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
