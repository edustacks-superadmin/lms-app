'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Trash2, Edit } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

export default function AdminTeamPage() {
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
            const response = await fetch('/api/admin/team');
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this team member?')) return;

        try {
            const response = await fetch(`/api/admin/team/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setItems(items.filter(item => item.id !== id));
            } else {
                alert('Failed to delete team member');
            }
        } catch (error) {
            console.error('Error deleting team member:', error);
        }
    };

    const filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.role.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage instructors and staff</p>
                </div>
                <button
                    onClick={() => router.push('/admin/team/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Add New Member
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or role..."
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
                    <Users className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No team members found</h3>
                    <p className="text-gray-500">Get started by adding a new team member.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="aspect-square bg-gray-100 relative">
                                {item.photo_url ? (
                                    <img
                                        src={item.photo_url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                        <Users size={48} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm">
                                    <button
                                        onClick={() => router.push(`/admin/team/edit/${item.id}`)}
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
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                <p className="text-sm text-blue-600 font-medium mb-2">{item.role}</p>
                                {item.bio && (
                                    <p className="text-sm text-gray-500 line-clamp-2">{item.bio}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
