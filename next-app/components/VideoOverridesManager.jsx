'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function VideoOverridesManager({ courseId }) {
    const [overrides, setOverrides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMemberId, setNewMemberId] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchOverrides();
    }, [courseId]);

    const fetchOverrides = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-overrides`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setOverrides(data.overrides || []);
            }
        } catch (error) {
            console.error('Error fetching overrides:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOverride = async (e) => {
        e.preventDefault();
        if (!newMemberId) {
            alert('Please enter a member ID');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-overrides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: parseInt(newMemberId),
                    notes
                })
            });

            if (response.ok) {
                alert('Override added successfully!');
                setNewMemberId('');
                setNotes('');
                setShowAddForm(false);
                fetchOverrides();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error adding override:', error);
            alert('Failed to add override');
        }
    };

    const handleRemoveOverride = async (overrideId, studentName) => {
        if (!confirm(`Remove unlimited access for ${studentName}?`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/admin/courses/${courseId}/video-overrides?overrideId=${overrideId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}` // Need to get session here too
                    }
                }
            );

            if (response.ok) {
                alert('Override removed successfully!');
                fetchOverrides();
            } else {
                alert('Failed to remove override');
            }
        } catch (error) {
            console.error('Error removing override:', error);
            alert('Failed to remove override');
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Shield className="text-green-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Video Access Overrides</h3>
                        <p className="text-sm text-gray-500">Grant unlimited video access to specific students</p>
                    </div>
                </div>

                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Override
                    </button>
                )}
            </div>

            {/* Add Override Form */}
            {showAddForm && (
                <form onSubmit={handleAddOverride} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Member ID
                            </label>
                            <input
                                type="number"
                                value={newMemberId}
                                onChange={(e) => setNewMemberId(e.target.value)}
                                placeholder="Enter member ID"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Reason for granting unlimited access..."
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                            >
                                <UserPlus size={18} className="inline mr-2" />
                                Grant Access
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewMemberId('');
                                    setNotes('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Overrides List */}
            {overrides.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Shield size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No overrides set. All students are subject to course restrictions.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {overrides.map((override) => (
                        <div
                            key={override.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800">
                                    {override.members?.name || override.members?.email}
                                </div>
                                {override.members?.email && override.members?.name && (
                                    <div className="text-sm text-gray-500">{override.members.email}</div>
                                )}
                                {override.notes && (
                                    <div className="text-xs text-gray-600 mt-1 italic">
                                        Note: {override.notes}
                                    </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                    Member ID: {override.member_id} • Added: {new Date(override.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveOverride(override.id, override.members?.name || override.members?.email)}
                                className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove override"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
