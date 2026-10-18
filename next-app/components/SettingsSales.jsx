'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Download, Filter, Search, Calendar, ChevronDown, CheckCircle, Clock, XCircle, MoreVertical, CreditCard, Banknote } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useProducts } from '../context/ProductContext';
import { useInstitute } from '../context/InstituteContext';

const SettingsSales = () => {
    const router = useRouter();
    const { products, fetchProducts } = useProducts();
    const { transactions, loading, error, approveOrder, rejectOrder } = useTransactions();
    const { institute } = useInstitute();
    const [showFilters, setShowFilters] = useState(true);

    const orderPrefix = useMemo(() => {
        if (!institute?.name) return '';
        return institute.name.substring(0, 6).toUpperCase();
    }, [institute]);

    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [duration, setDuration] = useState('Alldays');
    const [status, setStatus] = useState('completed');
    const [paymentType, setPaymentType] = useState('');
    const [sortBy, setSortBy] = useState('Latest');
    const [perPage, setPerPage] = useState(20);
    const [processingId, setProcessingId] = useState(null);

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const displayId = `${orderPrefix}${t.id}`;
            const matchesSearch = (displayId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (String(t.id)?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (t.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (String(t.utr || '')?.toLowerCase()).includes(searchTerm.toLowerCase());
            const matchesProduct = selectedProduct ? t.product_name === selectedProduct : true;
            const matchesStatus = status ? t.status === status : true;

            // Duration Filter (Basic implementation)
            let matchesDuration = true;
            if (duration !== 'Alldays') {
                const date = new Date(t.created_at);
                const now = new Date();
                if (duration === 'Today') {
                    matchesDuration = date.toDateString() === now.toDateString();
                } else if (duration === 'This Week') {
                    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
                    matchesDuration = date >= oneWeekAgo;
                } else if (duration === 'This Month') {
                    matchesDuration = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }
            }

            const matchesPaymentType = paymentType ? t.type === paymentType : true;

            return matchesSearch && matchesProduct && matchesStatus && matchesDuration && matchesPaymentType;
        });
    }, [searchTerm, selectedProduct, status, duration, transactions, orderPrefix, paymentType]);

    // Sort Logic
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortBy === 'Latest' ? dateB - dateA : dateA - dateB;
        });
    }, [filteredTransactions, sortBy]);

    // Summary Stats
    const totalTransactions = sortedTransactions.length;
    const totalEarnings = sortedTransactions.reduce((sum, t) => sum + (t.status === 'completed' ? (t.amount || 0) : 0), 0);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this order?')) {
            setProcessingId(id);
            await approveOrder(id);
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Are you sure you want to reject this order?')) {
            setProcessingId(id);
            await rejectOrder(id);
            setProcessingId(null);
        }
    };

    if (loading && !processingId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading transactions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-100">
                Error loading transactions: {error}
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Report</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        View and manage your transaction history and earnings
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search UTR, Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-900 placeholder:text-slate-400 group-hover:border-slate-400"
                        />
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <Filter size={18} /> Filter
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm">
                        <Download size={18} /> Export Excel
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by product</label>
                            <div className="relative">
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                                >
                                    <option value="">All Products</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.title}>{p.title}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Time Range</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                                >
                                    <option value="Alldays">All Time</option>
                                    <option value="Today">Today</option>
                                    <option value="This Week">This Week</option>
                                    <option value="This Month">This Month</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Type</label>
                            <div className="relative">
                                <select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                                >
                                    <option value="">All Types</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Razorpay">Razorpay</option>
                                    <option value="UPI">UPI</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-3">
                            <button className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm">
                                Apply Filters
                            </button>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedProduct('');
                                    setDuration('Alldays');
                                    setPaymentType('');
                                    setStatus('');
                                }}
                                className="px-5 py-2 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-600">Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                                >
                                    <option value="Latest">Latest</option>
                                    <option value="Oldest">Oldest</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-600">Show:</label>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value)}
                                    className="pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                                >
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Transactions</p>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{totalTransactions}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <CreditCard size={24} />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Earnings</p>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">₹ {totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <Banknote size={24} />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Order ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTransactions.map((t) => (
                                <tr
                                    key={t.id}
                                    className={`
                                        group transition-colors hover:bg-slate-50/80
                                        ${t.status === 'pending' ? 'bg-amber-50/30' : ''}
                                    `}
                                >
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {formatDate(t.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-blue-600 font-mono">
                                        {orderPrefix}{t.id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900 line-clamp-1" title={t.product_name}>
                                            {t.product_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {t.member_id ? (
                                            <div
                                                onClick={() => router.push(`/members/${t.member_id}`)}
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium flex items-center gap-1.5"
                                            >
                                                {t.user_email}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-600">{t.user_email}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`
                                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${['completed', 'success'].includes(t.status)
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : t.status === 'pending'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-red-50 text-red-700 border-red-100'}
                                        `}>
                                            {['completed', 'success'].includes(t.status) ? (
                                                <CheckCircle size={12} />
                                            ) : t.status === 'pending' ? (
                                                <Clock size={12} />
                                            ) : (
                                                <XCircle size={12} />
                                            )}
                                            {['completed', 'success'].includes(t.status) ? 'Completed' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                                        {t.type || t.payment_method || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right font-mono">
                                        ₹{(t.amount || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sortedTransactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No transactions found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            Try adjusting your search or filters to find what you're looking for.
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedProduct('');
                                setDuration('Alldays');
                                setPaymentType('');
                                setStatus('');
                            }}
                            className="mt-6 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsSales;
