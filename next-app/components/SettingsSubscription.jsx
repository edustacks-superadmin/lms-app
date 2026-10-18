import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Calendar, User, Layers, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { useUsers } from '../context/UserContext';
import { useBatches } from '../context/BatchContext';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';

import { addMembersToBatch } from '../app/actions/batch';

const SettingsSubscription = () => {
    const { institute } = useInstitute();
    const [view, setView] = useState('list'); // 'list' or 'create'
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Context Data
    const { users } = useUsers();
    const { batches } = useBatches();

    // Form State
    const [formData, setFormData] = useState({
        member_id: '', // Changed from user_id to member_id for clarity
        batch_id: '',
        expires_on: ''
    });

    // Extend Expiry State
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [newExpiryDate, setNewExpiryDate] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (institute?.id) {
            fetchSubscriptions();
        }
    }, [institute?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeDropdown]);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            // Fetch subscriptions with related user and batch data
            // ONLY show subscriptions with actual expiry dates (not NULL/lifetime from batch management)
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    batch:batches(name),
                    member:members(display_name, email, photo_url)
                `)
                .eq('institute_id', institute?.id)
                .not('expires_on', 'is', null) // Exclude NULL expiry (batch-only memberships)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Auto-expire subscriptions that have passed their expiry date
            const today = new Date().toISOString().split('T')[0];
            const expiredSubs = (data || []).filter(sub =>
                sub.expires_on && sub.expires_on < today && sub.status === 'Active'
            );

            // Update expired subscriptions
            if (expiredSubs.length > 0) {
                const expiredIds = expiredSubs.map(sub => sub.id);
                await supabase
                    .from('subscriptions')
                    .update({ status: 'Expired' })
                    .in('id', expiredIds);

                // Re-fetch to get updated data
                const { data: updatedData } = await supabase
                    .from('subscriptions')
                    .select(`
                        *,
                        batch:batches(name),
                        member:members(display_name, email, photo_url)
                    `)
                    .eq('institute_id', institute?.id)
                    .not('expires_on', 'is', null)
                    .order('created_at', { ascending: false });

                setSubscriptions(updatedData || []);
            } else {
                setSubscriptions(data || []);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: Expiry date is required
        if (!formData.expires_on) {
            alert('Please select an expiry date');
            return;
        }

        try {
            // Use server action to ensure both batch membership and subscription are created
            const result = await addMembersToBatch(
                formData.batch_id,
                [formData.member_id],
                formData.expires_on,
                institute?.id
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            await fetchSubscriptions();
            setView('list');
            setFormData({ member_id: '', batch_id: '', expires_on: '' });
            alert('Subscription created successfully!');
        } catch (error) {
            console.error('Error creating subscription:', error);
            alert('Error creating subscription: ' + error.message);
        }
    };

    const handleUnsubscribe = async (subscription) => {
        if (!window.confirm('This will unsubscribe the user and remove them from the batch. Continue?')) return;

        try {
            // 1. Delete from subscriptions table
            const { error: subError } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', subscription.id);

            if (subError) throw subError;

            // 2. Delete from batch_members table
            const { error: batchError } = await supabase
                .from('batch_members')
                .delete()
                .eq('batch_id', subscription.batch_id)
                .eq('member_id', subscription.member_id);

            if (batchError) {
                console.error('Error removing from batch:', batchError);
                // Continue anyway as subscription is already deleted
            }

            alert('User unsubscribed and removed from batch successfully');
            fetchSubscriptions();
            setActiveDropdown(null);
        } catch (error) {
            console.error('Error unsubscribing:', error);
            alert('Error unsubscribing user: ' + error.message);
        }
    };

    const handleExtendExpiry = (subscription) => {
        setSelectedSubscription(subscription);
        // Set current expiry date as default
        setNewExpiryDate(subscription.expires_on || '');
        setExtendModalOpen(true);
        setActiveDropdown(null);
    };

    const handleUpdateExpiry = async () => {
        if (!newExpiryDate) {
            alert('Please select a new expiry date');
            return;
        }

        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ expires_on: newExpiryDate })
                .eq('id', selectedSubscription.id);

            if (error) throw error;

            // Also update member's expiry_date if needed
            if (selectedSubscription.member_id) {
                await supabase
                    .from('members')
                    .update({ expiry_date: newExpiryDate })
                    .eq('id', selectedSubscription.member_id);
            }

            alert('Expiry date updated successfully!');
            fetchSubscriptions();
            setExtendModalOpen(false);
            setSelectedSubscription(null);
            setNewExpiryDate('');
        } catch (error) {
            console.error('Error updating expiry:', error);
            alert('Error updating expiry date: ' + error.message);
        }
    };

    const getUserName = (userId) => {
        // userId here can be Auth ID or Member ID
        // We need to find the member who has this user_id or id
        const user = users.find(u => u.user_id === userId || u.id == userId);
        return user ? (user.name || user.display_name || user.email) : userId; // Fallback to ID if name not found
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        // Get user name safely - use member data if available, otherwise fetch from context
        const memberName = sub.member?.display_name || sub.member?.email || '';
        const userName = memberName || (sub.member_id ? (getUserName(sub.member_id) || '') : '');
        const batchName = sub.batch?.name || '';
        const query = searchQuery.toLowerCase();

        // Safe toLowerCase with fallback to empty string
        const userNameLower = (userName || '').toLowerCase();
        const batchNameLower = (batchName || '').toLowerCase();

        return userNameLower.includes(query) || batchNameLower.includes(query);
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSubscriptions.slice(indexOfFirstItem, indexOfLastItem);

    // Pagination handlers
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);


    if (view === 'create') {
        return (
            <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('list')}
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create Subscription</h2>
                        <p className="text-slate-500 text-sm mt-1">Assign a batch to a user with an expiry date</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl">
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">User</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    name="member_id"
                                    value={formData.member_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 appearance-none cursor-pointer"
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name || user.display_name || user.email} ({user.email})</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Batches</label>
                            <div className="relative">
                                <Layers size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    name="batch_id"
                                    value={formData.batch_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 appearance-none cursor-pointer"
                                >
                                    <option value="">Select Batch</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Expires on</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    name="expires_on"
                                    value={formData.expires_on}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                            >
                                Create Subscription
                            </button>
                        </div>
                    </form>
                </div >
            </div >
        );
    }

    return (
        <div className="flex-1 p-8 max-w-[1400px] mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Subscriptions</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Manage user subscriptions and batch access
                    </p>
                </div>
                <button
                    onClick={() => setView('create')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                >
                    <Plus size={18} /> Create Subscription
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-sm">
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires on</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading subscriptions...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No subscriptions found
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map(sub => (
                                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {sub.member?.display_name || (sub.member_id ? getUserName(sub.member_id) : 'Unknown User')}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {sub.member?.email || ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {sub.batch?.name || 'Unknown Batch'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(sub.expires_on).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sub.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {sub.status === 'Active' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> : <Clock size={12} />}
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right relative dropdown-container">
                                            <button
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                onClick={() => setActiveDropdown(activeDropdown === sub.id ? null : sub.id)}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {activeDropdown === sub.id && (
                                                <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExtendExpiry(sub);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Calendar size={16} className="text-slate-400" />
                                                            Extend Expiry
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnsubscribe(sub);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <X size={16} />
                                                            Unsubscribe
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredSubscriptions.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* Items per page selector */}
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>Show</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span>entries</span>
                            <span className="text-slate-400 hidden sm:inline">|</span>
                            <span className="hidden sm:inline">
                                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredSubscriptions.length)} of {filteredSubscriptions.length}
                            </span>
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                                    const showPage =
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                                    const showEllipsis =
                                        (pageNum === currentPage - 2 && currentPage > 3) ||
                                        (pageNum === currentPage + 2 && currentPage < totalPages - 2);

                                    if (showEllipsis) {
                                        return <span key={pageNum} className="px-2 text-slate-400">...</span>;
                                    }

                                    if (!showPage) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`
                                                w-8 h-8 rounded-lg text-sm font-medium transition-colors
                                                ${pageNum === currentPage
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-slate-100'}
                                            `}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Extend Expiry Modal */}
            {extendModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-semibold text-slate-800">Extend Expiry Date</h3>
                            <button
                                onClick={() => setExtendModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg">
                                Update expiry date for <span className="font-bold">{selectedSubscription?.member?.display_name || 'User'}</span> in <span className="font-bold">{selectedSubscription?.batch?.name || 'Batch'}</span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">New Expiry Date</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={newExpiryDate}
                                        onChange={(e) => setNewExpiryDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Current Expiry: <span className="font-medium text-slate-700">{selectedSubscription?.expires_on ? new Date(selectedSubscription.expires_on).toLocaleDateString() : 'N/A'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setExtendModalOpen(false);
                                    setSelectedSubscription(null);
                                    setNewExpiryDate('');
                                }}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateExpiry}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                            >
                                Update Expiry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsSubscription;
