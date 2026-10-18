'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Tag, User, BarChart, RefreshCw, Ticket, Check, X, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import AdminLayout from '../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../components/AdminStoreSidebar';
import { useInstitute } from '../../../../context/InstituteContext';
import { useOffers } from '../../../../context/OfferContext';
import CouponStats from '../../../../components/CouponStats';

const CouponsPage = () => {
    const router = useRouter();
    const { institute } = useInstitute();
    const {
        offers: coupons,
        loading,
        fetchOffers: fetchCoupons,
        toggleOfferStatus,
        bulkDeleteOffers,
        bulkUpdateOffers
    } = useOffers();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (institute?.id) {
            fetchCoupons();
        }
    }, [institute?.id]);

    const filteredCoupons = coupons.filter(coupon =>
        coupon.status !== 'deleted' &&
        (coupon.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coupon.influencer_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCoupons.map(c => c.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        // Use bulkUpdateOffers for soft delete to ensure consistency
        await bulkUpdateOffers(selectedIds, { status: 'deleted' });
        setSelectedIds([]);
        setShowDeleteModal(false);
    };

    const handleBulkStatusChange = async (status) => {
        if (selectedIds.length === 0) return;
        await bulkUpdateOffers(selectedIds, { status });
        setSelectedIds([]);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50/50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Store Coupons</h1>
                                <p className="text-slate-500 font-medium">Manage and track your promo codes and discounts.</p>
                            </div>
                            <button
                                onClick={() => router.push('/admin/store/coupons/new')}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm font-bold active:scale-95"
                            >
                                <Plus size={18} strokeWidth={3} />
                                New Coupon
                            </button>
                        </div>
                    </div>

                    <CouponStats coupons={coupons} />

                    {/* Main Content Area */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        {/* Filters Bar */}
                        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSelectAll}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                                        }`}
                                >
                                    {selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0 ? <Check size={16} strokeWidth={3} /> : null}
                                    {selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0 ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedIds.length > 0 && (
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest pl-2">
                                        {selectedIds.length} Coupons Selected
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-1 lg:max-w-md">
                                <div className="relative flex-1 group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by code or influencer..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                                    />
                                </div>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest p-2"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={fetchCoupons}
                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Refresh List"
                                >
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Usage / Table Section */}
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Coupons...</p>
                            </div>
                        ) : filteredCoupons.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                                    <Ticket size={40} className="text-slate-200" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">
                                    {searchTerm ? 'No matching coupons' : 'No coupons available'}
                                </h3>
                                <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
                                    {searchTerm
                                        ? `We couldn't find any promo codes matching "${searchTerm}". Try a different search term.`
                                        : 'You haven\'t created any coupons yet. Start by creating your first promotional offer.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="w-12 pl-6 py-4"></th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Coupon Detail</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Discount</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Performance</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredCoupons.map((coupon) => (
                                            <tr
                                                key={coupon.id}
                                                className={`group transition-all hover:bg-blue-50/30 ${selectedIds.includes(coupon.id) ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <td className="pl-6 py-5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(coupon.id)}
                                                        onChange={() => toggleSelect(coupon.id)}
                                                        className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                                                            {coupon.code}
                                                            {coupon.influencer_name && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black uppercase">
                                                                    <User size={10} /> Influencer
                                                                </span>
                                                            )}
                                                        </span>
                                                        {coupon.influencer_name && (
                                                            <span className="text-xs text-slate-400 font-medium mt-0.5">{coupon.influencer_name}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-slate-800 tracking-tight">
                                                            {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Off</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {coupon.discount_type === 'percent' ? 'Percentage' : 'Flat Discount'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5 max-w-[120px]">
                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                                            <span className="text-slate-400">Uses</span>
                                                            <span className="text-slate-900">{coupon.usage_count || 0} / {coupon.max_uses || '∞'}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                                                                style={{ width: `${Math.min(100, (coupon.usage_count / (coupon.max_uses || 100)) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <button
                                                        onClick={() => toggleOfferStatus(coupon.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-90 ${coupon.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200'
                                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-500'
                                                            }`}
                                                    >
                                                        {coupon.status === 'active' ? (
                                                            <span className="flex items-center gap-1.5"><Check size={12} strokeWidth={3} /> Active</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5"><X size={12} strokeWidth={3} /> Expired</span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {coupon.end_date ? format(new Date(coupon.end_date), 'MMM d, yyyy') : 'No Expiry'}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Valid Until</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Bulk Actions Floating Bar */}
                    {selectedIds.length > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-3 border-r border-slate-700 pr-8">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                    {selectedIds.length}
                                </div>
                                <span className="text-sm font-bold tracking-tight">Coupons Selected</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleBulkStatusChange('active')}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    <Check size={14} strokeWidth={3} /> Activate
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('expired')}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    <X size={14} strokeWidth={3} /> Expire
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-600/50 active:scale-95"
                                >
                                    <Trash2 size={14} strokeWidth={2} /> Delete
                                </button>

                                <div className="w-px h-8 bg-slate-700 mx-2" />

                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest px-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                {/* Confirm Delete Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)} />
                        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-500">
                                <Trash2 size={24} strokeWidth={2} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Delete {selectedIds.length} Coupon{selectedIds.length > 1 ? 's' : ''}?</h3>
                            <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">
                                Are you sure you want to delete the selected coupons? This action will mark them as deleted and hide them from the list.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-200"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default CouponsPage;
