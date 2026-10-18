'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBatches } from '../../../context/BatchContext';
import { useUsers } from '../../../context/UserContext';
import { ArrowLeft, User, Search, Trash2, Plus, X, Calendar } from 'lucide-react';

const BatchDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { batches, getBatchMembers, removeMembersFromBatch, addMembersToBatch } = useBatches();
    const { users, fetchUsers } = useUsers();

    const [batch, setBatch] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Add Member Modal State
    const [openAddModal, setOpenAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        if (id && batches.length > 0) {
            const foundBatch = batches.find(b => b.id.toString() === id.toString());
            if (foundBatch) {
                setBatch(foundBatch);
                fetchMembers(foundBatch.id);
            } else {
                setLoading(false);
            }
        }
    }, [id, batches]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchMembers = async (batchId) => {
        try {
            setLoading(true);
            const data = await getBatchMembers(batchId);
            setMembers(data || []);
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm('Are you sure you want to remove this user from the batch?')) {
            try {
                await removeMembersFromBatch(id, [memberId]);
                fetchMembers(id);
            } catch (error) {
                alert('Failed to remove member: ' + error.message);
            }
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            setAddingMember(true);
            await addMembersToBatch(id, [selectedUser], expiryDate || null);
            setOpenAddModal(false);
            setSelectedUser('');
            setExpiryDate('');
            fetchMembers(id);
            alert('Member added successfully!');
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Failed to add member: ' + error.message);
        } finally {
            setAddingMember(false);
        }
    };

    const filteredMembers = members.filter(member =>
        (member.display_name || member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Candidates to add (users not already in the batch)
    // Note: This simple filtering assumes all users are loaded. For large sets, server-side filtering is better.
    const availableUsers = users.filter(u => !members.some(m => m.id === u.id));

    if (loading && !batch) {
        return <div className="p-10 text-center text-slate-500">Loading...</div>;
    }

    if (!batch && !loading) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">Batch not found</h2>
                <button
                    onClick={() => router.push('/batches')}
                    className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium"
                >
                    Back to Batches
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => router.push('/batches')}
                        className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 m-0">{batch?.name}</h1>
                        <div className="text-sm text-slate-500 mt-1">
                            {members.length} Users Enrolled
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setOpenAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus size={18} /> Add Member
                </button>
            </div>

            {/* Content */}
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 m-0">Enrolled Users</h3>
                    <div className="relative w-80">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-all"
                        />
                        <Search size={18} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.length > 0 ? (
                                filteredMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {member.photo_url ? (
                                                        <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={16} className="text-slate-500" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-900 text-sm">
                                                    {member.display_name || member.name || 'Unknown User'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-600">{member.email}</td>
                                        <td className="px-5 py-4 text-sm text-slate-600">{member.phone_number || member.mobile || '--'}</td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="Remove from batch"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-10 py-16 text-center text-slate-500 text-sm">
                                        {members.length === 0 ? 'No users in this batch yet.' : 'No users match your search.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Member Modal */}
            {openAddModal && (
                <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-slate-900 m-0">Add Member to Batch</h3>
                            <button
                                onClick={() => setOpenAddModal(false)}
                                className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMember}>
                            <div className="mb-5">
                                <label className="block mb-2 font-medium text-sm text-slate-700">Select User</label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                                    required
                                >
                                    <option value="">-- Choose a user --</option>
                                    {availableUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.display_name || user.name || user.email} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block mb-2 font-medium text-sm text-slate-700">
                                    Expiry Date (Optional)
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                    />
                                    <Calendar size={18} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Leave blank for lifetime access (adds to batch without subscription expiry).
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setOpenAddModal(false)}
                                    className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingMember}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {addingMember ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchDetailsPage;
