'use client';

import React, { useMemo } from 'react';
import { Ticket, Activity, TrendingUp, Users } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500`} />

        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {subtitle && <span className="text-xs font-bold text-slate-400 uppercase">{subtitle}</span>}
                </div>
            </div>
            <div className={`p-3 bg-${color}-50 rounded-xl text-${color}-600 group-hover:scale-110 transition-transform shadow-sm border border-${color}-100`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
    </div>
);

const CouponStats = ({ coupons = [] }) => {
    const stats = useMemo(() => {
        const total = coupons.length;
        const active = coupons.filter(c => c.status === 'active').length;
        const totalRedemptions = coupons.reduce((acc, c) => acc + (c.usage_count || 0), 0);
        const avgUsage = total > 0 ? (totalRedemptions / total).toFixed(1) : 0;

        return [
            {
                title: 'Total Coupons',
                value: total,
                icon: Ticket,
                color: 'blue',
                subtitle: 'Codes'
            },
            {
                title: 'Active Now',
                value: active,
                icon: Activity,
                color: 'emerald',
                subtitle: 'Live'
            },
            {
                title: 'Redemptions',
                value: totalRedemptions,
                icon: Users,
                color: 'violet',
                subtitle: 'Uses'
            },
            {
                title: 'Avg. Usage',
                value: avgUsage,
                icon: TrendingUp,
                color: 'orange',
                subtitle: 'Per Code'
            }
        ];
    }, [coupons]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
            ))}
        </div>
    );
};

export default CouponStats;
