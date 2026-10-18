'use client';

import React from 'react';
import { Package, Clock, CheckCircle, Tag } from 'lucide-react';
import { useProducts } from '../context/ProductContext';

const StatCard = ({ title, value, icon: Icon, color, loading, subtitle }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
        <div className="flex-1">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">{title}</p>
            {loading ? (
                <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
                </div>
            )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${color}`}>
            <Icon size={24} strokeWidth={2.5} />
        </div>
    </div>
);

const ProductStats = () => {
    const { products, loading } = useProducts();

    const stats = {
        total: products.length,
        approved: products.filter(p => (p.status || 'approved') === 'approved').length,
        pending: products.filter(p => p.status === 'pending').length,
        draft: products.filter(p => p.status === 'draft').length
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
                title="Total Products"
                value={stats.total}
                icon={Package}
                color="bg-blue-50 text-blue-600"
                loading={loading}
                subtitle="Items"
            />
            <StatCard
                title="Approved"
                value={stats.approved}
                icon={CheckCircle}
                color="bg-emerald-50 text-emerald-600"
                loading={loading}
                subtitle="Live"
            />
            <StatCard
                title="Pending"
                value={stats.pending}
                icon={Clock}
                color="bg-amber-50 text-amber-600"
                loading={loading}
                subtitle="Review"
            />
            <StatCard
                title="Drafts"
                value={stats.draft}
                icon={Tag}
                color="bg-slate-50 text-slate-400"
                loading={loading}
                subtitle="Saved"
            />
        </div>
    );
};

export default ProductStats;
