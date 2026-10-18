'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '../../../context/UserContext';
import { supabase } from '../../../supabaseClient';
import { ChevronLeft, Edit, Mail, Phone, MapPin, Calendar, User, Shield, Layers, Plus, ShoppingBag, Monitor, Smartphone, Globe, Trash2, MoreVertical, Key } from 'lucide-react';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../actions/user';
import ConfirmationModal from '../../../components/ConfirmationModal';

// Use React.use() to unwrap params in Next.js 15+ / 16
const MemberDetails = ({ params }) => {
    // Determine how to unwrap params. In Next.js 15+, params is a Promise.
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDanger: false,
        onConfirm: () => { }
    });
    const { updateUser, updateUserPassword } = useUsers();

    // Fetch member directly from database
    useEffect(() => {
        const fetchMember = async () => {
            try {
                const { data, error } = await supabase
                    .from('members')
                    .select(`
                        *,
                        batch_members(
                            batch_id,
                            batches(name)
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Map to expected format
                const mappedUser = {
                    ...data,
                    displayName: data.display_name || data.email || 'No Name',
                    joinedDate: data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : '-',
                    batches: data.batch_members && data.batch_members.length > 0
                        ? data.batch_members.map(bm => bm.batches?.name).filter(Boolean).join(', ')
                        : null
                };

                setUser(mappedUser);
            } catch (error) {
                console.error('Error fetching member:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMember();
        }
    }, [id]);

    useEffect(() => {
        if (user?.id) {
            const fetchDetails = async () => {
                // Fetch Subscriptions
                try {
                    const { data: subData, error: subError } = await supabase
                        .from('subscriptions')
                        .select('*, batch:batches(name)')
                        .eq('member_id', user.id)
                        .order('expires_on', { ascending: false });

                    if (subError) console.error('Error fetching subscriptions:', subError);
                    else setSubscriptions(subData || []);
                } catch (e) {
                    console.error("Sub fetch error", e);
                }

                // Fetch Orders
                try {
                    const { data: orderData, error: orderError } = await supabase
                        .from('orders')
                        .select('*, product:products(title)')
                        .eq('member_id', user.id)
                        .order('created_at', { ascending: false });

                    if (orderError) console.error('Error fetching orders:', orderError);
                    else setOrders(orderData || []);
                } catch (e) {
                    console.error("Order fetch error", e);
                }

                // Fetch Sessions (needs auth_user_id)
                let authUserId = user.auth_user_id;
                if (!authUserId) {
                    // Start fetching auth_user_id from Supabase if missing
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('auth_user_id')
                        .eq('id', user.id)
                        .single();
                    if (memberData) authUserId = memberData.auth_user_id;
                }

                if (authUserId) {
                    const res = await getUserSessions(authUserId);
                    if (res.success) setSessions(res.data);
                    else console.error(res.error);
                }
            };
            fetchDetails();
        }
    }, [user]);

    const handleBlockUser = async () => {
        setConfirmationModal({
            isOpen: true,
            title: user.is_blocked ? 'Unblock User' : 'Block User',
            message: `Are you sure you want to ${user.is_blocked ? 'unblock' : 'block'} this user?`,
            confirmText: user.is_blocked ? 'Unblock' : 'Block',
            isDanger: !user.is_blocked, // Blocking is dangerous
            onConfirm: async () => {
                const result = await updateUser(user.id, {
                    is_blocked: !user.is_blocked,
                    status: !user.is_blocked ? 'suspended' : 'active'
                });

                if (result.success) {
                    setUser(prev => ({ ...prev, is_blocked: !prev.is_blocked, status: !prev.is_blocked ? 'suspended' : 'active' }));
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Success',
                        message: `User ${user.is_blocked ? 'unblocked' : 'blocked'} successfully`,
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: () => window.location.reload()
                    });
                } else {
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to update user status: ' + result.error,
                        confirmText: 'OK',
                        cancelText: null,
                        isDanger: true,
                        onConfirm: () => { }
                    });
                }
            }
        });
    };

    const handleRevokeSession = async (sessionId) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Revoke Session',
            message: 'Are you sure you want to logout this device?',
            confirmText: 'Logout',
            isDanger: true,
            onConfirm: async () => {
                const res = await revokeSession(sessionId);
                if (res.success) {
                    setSessions(prev => prev.filter(s => s.id !== sessionId));
                } else {
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to revoke session: ' + res.error,
                        confirmText: 'OK',
                        cancelText: null,
                        isDanger: true,
                        onConfirm: () => { }
                    });
                }
            }
        });
    };

    const handleRevokeAllSessions = async () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Revoke All Sessions',
            message: 'Are you sure you want to logout all devices?',
            confirmText: 'Logout All',
            isDanger: true,
            onConfirm: async () => {
                let authUserId = user.auth_user_id;
                if (!authUserId) {
                    const { data: memberData } = await supabase.from('members').select('auth_user_id').eq('id', user.id).single();
                    authUserId = memberData?.auth_user_id;
                }

                if (!authUserId) return;

                const res = await revokeAllSessions(authUserId);
                if (res.success) {
                    setSessions([]);
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'All devices logged out successfully',
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: () => { }
                    });
                } else {
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to revoke all sessions: ' + res.error,
                        confirmText: 'OK',
                        cancelText: null,
                        isDanger: true,
                        onConfirm: () => { }
                    });
                }
            }
        });
    };

    const handleUnsubscribeFromMember = async (subscriptionId) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Unsubscribe Member',
            message: 'Are you sure you want to unsubscribe this user from this batch?',
            confirmText: 'Unsubscribe',
            isDanger: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('subscriptions')
                        .update({ status: 'Inactive' })
                        .eq('id', subscriptionId);

                    if (error) throw error;

                    // Refresh subscriptions
                    setSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));
                    setActiveDropdown(null);

                    setConfirmationModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Subscription updated successfully!',
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: () => { }
                    });
                } catch (error) {
                    console.error('Error unsubscribing:', error);
                    setConfirmationModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error updating subscription: ' + error.message,
                        confirmText: 'OK',
                        cancelText: null,
                        isDanger: true,
                        onConfirm: () => { }
                    });
                }
            }
        });
    };

    const handleExtendExpiry = (subscription) => {
        setSelectedSubscription(subscription);
        setNewExpiryDate(subscription.expires_on || '');
        setExtendModalOpen(true);
        setActiveDropdown(null);
    };

    const handleUpdateExpiry = async () => {
        if (!newExpiryDate) {
            setConfirmationModal({
                isOpen: true,
                title: 'Error',
                message: 'Please select a new expiry date',
                confirmText: 'OK',
                cancelText: null,
                isDanger: false,
                onConfirm: () => { }
            });
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

            // Refresh subscriptions
            setSubscriptions(prev => prev.map(s =>
                s.id === selectedSubscription.id
                    ? { ...s, expires_on: newExpiryDate }
                    : s
            ));

            setExtendModalOpen(false);
            setSelectedSubscription(null);
            setNewExpiryDate('');

            setConfirmationModal({
                isOpen: true,
                title: 'Success',
                message: 'Expiry date updated successfully!',
                confirmText: 'OK',
                cancelText: null,
                onConfirm: () => { }
            });
        } catch (error) {
            console.error('Error updating expiry:', error);
            setConfirmationModal({
                isOpen: true,
                title: 'Error',
                message: 'Error updating expiry date: ' + error.message,
                confirmText: 'OK',
                cancelText: null,
                isDanger: true,
                onConfirm: () => { }
            });
        }
    };

    const getDeviceIcon = (ua) => {
        if (!ua) return Globe;
        const lower = ua.toLowerCase();
        if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return Smartphone;
        return Monitor;
    };

    const formatUserAgent = (ua) => {
        if (!ua) return 'Unknown Device';

        let browser = 'Browser';
        let os = 'Unknown OS';

        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        if (ua.includes('Android')) {
            const match = ua.match(/Android\s([0-9.]+)/);
            os = match ? `Android ${match[1]}` : 'Android';
        } else if (ua.includes('iPhone')) {
            os = 'iOS';
        } else if (ua.includes('Windows')) {
            os = 'Windows';
        } else if (ua.includes('Mac')) {
            os = 'macOS';
        } else if (ua.includes('Linux')) {
            os = 'Linux';
        }

        return `${browser} on ${os}`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>
                Loading member details...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#666' }}>
                <p>Member not found</p>
                <button
                    className="mt-4 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                    onClick={() => router.push('/members')}
                >
                    Back to Members
                </button>
            </div>
        );
    }

    const DetailItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
            <div className="mt-0.5 text-slate-400">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                <div className="text-sm text-slate-900 font-medium">{value || '--'}</div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/members')}
                            className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors text-slate-500"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Member Details</h1>
                            <p className="text-sm text-slate-500 mt-1">View member information</p>
                        </div>
                    </div>
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                        onClick={() => router.push(`/members/${id}/edit`)}
                    >
                        <Edit size={16} /> Edit Member
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8">
                        {/* Profile Header */}
                        <div className="flex items-center gap-6 pb-8 border-b border-slate-100 mb-8">
                            {/* Smart Avatar */}
                            <div
                                className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-white shrink-0"
                                style={{
                                    backgroundColor: (() => {
                                        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                                        const colorIndex = ((user.displayName || user.email || '').length + (user.id || 0)) % colors.length;
                                        return colors[colorIndex];
                                    })()
                                }}
                            >
                                {user.photo_url ? (
                                    <img
                                        src={user.photo_url}
                                        alt={user.display_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <span className="text-4xl font-bold">
                                        {(user.display_name || user.email || '?').substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                                            {user.display_name || user.username || 'Unknown User'}
                                        </h2>
                                        <div className="flex gap-2 items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'staff' ? 'bg-sky-100 text-sky-700' :
                                                    user.role === 'mentor' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {user.role || 'Student'}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 ${user.status === 'active' || !user.is_blocked ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                                {user.is_blocked ? 'Blocked' : 'Active'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                            onClick={() => setChangePasswordModalOpen(true)}
                                        >
                                            <Key size={14} /> Change Password
                                        </button>
                                        <button
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                            onClick={handleBlockUser}
                                        >
                                            <Shield size={14} /> {user.is_blocked ? 'Unblock' : 'Block'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Left Column */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                                    Personal Information
                                </h3>
                                <div className="flex flex-col">
                                    <DetailItem icon={User} label="Full Name" value={`${user.first_name || ''} ${user.last_name || ''}`.trim()} />
                                    <DetailItem icon={Mail} label="Email Address" value={user.email} />
                                    <DetailItem icon={Phone} label="Mobile Number" value={user.phone_number || user.mobile} />
                                    <DetailItem icon={Calendar} label="Birth Date" value={user.birth_date ? new Date(user.birth_date).toLocaleDateString() : null} />
                                    <DetailItem icon={User} label="Gender" value={user.gender} />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                                    Account & Address
                                </h3>
                                <div className="flex flex-col">
                                    <DetailItem icon={Shield} label="Username" value={user.username} />

                                    {/* Batches as Tags */}
                                    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                                        <div className="mt-0.5 text-slate-400"><Layers size={18} /></div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Batches</div>
                                            <div className="flex flex-wrap gap-2">
                                                {user.batches ? (
                                                    user.batches.split(',').map((batch, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                                                            {batch.trim()}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">No batches assigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <DetailItem icon={Calendar} label="Joined Date" value={user.joinedDate} />
                                    <DetailItem icon={MapPin} label="Address" value={
                                        [user.address1, user.address2, user.city, user.state, user.zip]
                                            .filter(Boolean)
                                            .join(', ') || 'Not Provided'
                                    } />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscriptions Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 overflow-visible max-w-5xl mx-auto">
                    <div className="p-8 overflow-visible">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Active Subscriptions</h3>
                            <button
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                onClick={() => router.push('/settings/subscription')}
                            >
                                <Plus size={16} /> Create Subscription
                            </button>
                        </div>

                        <div className="relative overflow-visible">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Expires On</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subscriptions.length > 0 ? (
                                        subscriptions.map(sub => (
                                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-900 font-medium">{sub.batch?.name || 'Unknown Batch'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-900">
                                                    {!sub.expires_on ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                                            Lifetime
                                                        </span>
                                                    ) : (
                                                        new Date(sub.expires_on).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 relative">
                                                    <button
                                                        onClick={() => setActiveDropdown(activeDropdown === sub.id ? null : sub.id)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {activeDropdown === sub.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                                <button
                                                                    onClick={() => handleUnsubscribeFromMember(sub.id)}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                                >
                                                                    Unsubscribe
                                                                </button>
                                                                <button
                                                                    onClick={() => handleExtendExpiry(sub)}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    Extend Expiry Date
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-slate-500 italic">
                                                No active subscriptions found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Orders Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 max-w-5xl mx-auto">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <ShoppingBag size={20} className="text-slate-900" />
                            <h3 className="text-lg font-bold text-slate-900">Order History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.length > 0 ? (
                                        orders.map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-slate-900">#{order.id}</td>
                                                <td className="px-6 py-4 text-sm text-slate-900">{order.product?.title || 'Unknown Product'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-900">₹{order.amount}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${order.status === 'completed' || order.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        order.status === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                            'bg-red-100 text-red-700 border border-red-200'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                                                No orders found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sessions Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-8 mb-12 max-w-5xl mx-auto">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Monitor size={20} className="text-slate-900" />
                                <h3 className="text-lg font-bold text-slate-900">Currently Logged in devices</h3>
                            </div>
                            {sessions.length > 0 && (
                                <button
                                    onClick={handleRevokeAllSessions}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Logout of all devices
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">S.No</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Device name</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Last used</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sessions.length > 0 ? (
                                        sessions.map((session, index) => {
                                            const DeviceIcon = getDeviceIcon(session.user_agent);
                                            return (
                                                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-900">
                                                        <div className="flex items-center gap-2">
                                                            <DeviceIcon size={16} className="text-slate-500" />
                                                            <span title={session.user_agent}>{formatUserAgent(session.user_agent)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {session.updated_at ? new Date(session.updated_at).toLocaleString() : 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        Unknown
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-blue-600 font-mono">
                                                        {session.ip || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            title="Logout device"
                                                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                                                No active sessions found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Extend Expiry Modal */}
                {/* Extend Expiry Modal */}
                {extendModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">
                                Extend Expiry Date
                            </h3>

                            <p className="text-sm text-slate-500 mb-6">
                                Update expiry date for <strong>{user?.display_name || 'User'}</strong> in <strong>{selectedSubscription?.batch?.name || 'Batch'}</strong>
                            </p>

                            <div className="mb-6 space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Current Expiry: {selectedSubscription?.expires_on ? new Date(selectedSubscription.expires_on).toLocaleDateString() : 'N/A'}
                                </label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="date"
                                        value={newExpiryDate}
                                        onChange={(e) => setNewExpiryDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        setExtendModalOpen(false);
                                        setSelectedSubscription(null);
                                        setNewExpiryDate('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                    onClick={handleUpdateExpiry}
                                >
                                    Update Expiry
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Change Password Modal */}
                {changePasswordModalOpen && (
                    <ChangePasswordModal
                        user={user}
                        onClose={() => setChangePasswordModalOpen(false)}
                    />
                )}

                {/* Confirmation Modal */}
                {confirmationModal.isOpen && (
                    <ConfirmationModal
                        isOpen={confirmationModal.isOpen}
                        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={confirmationModal.onConfirm}
                        title={confirmationModal.title}
                        message={confirmationModal.message}
                        confirmText={confirmationModal.confirmText}
                        cancelText={confirmationModal.cancelText}
                        isDanger={confirmationModal.isDanger}
                    />
                )}
            </div>
        </div>

    );
};

const ChangePasswordModal = ({ user, onClose }) => {
    const { updateUserPassword } = useUsers();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        // Use the auth_user_id (auth id) if available, otherwise fallback to member id/get it from RPC logic
        const targetId = user.auth_user_id || user.id;

        const result = await updateUserPassword(targetId, password);

        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Change Password</h3>

                {success ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <Shield size={24} />
                        </div>
                        <p className="text-green-700 font-medium">Password updated successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="text-sm text-slate-500 mb-6">
                            Update password for <strong>{user?.display_name || user?.email}</strong>
                        </p>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm mb-4 border border-red-100 flex items-center gap-2">
                                <Shield size={16} />
                                {error}
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <Key size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <Edit size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MemberDetails;
