'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MessageSquare, CheckCircle, Trash2, Pin, Lock, BarChart3, Search } from 'lucide-react';

const ForumSidebar = ({ stats, onSearch, searchQuery }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentStatus = searchParams.get('status') || 'all';

    const handleStatusChange = (status) => {
        const params = new URLSearchParams(searchParams);
        if (status === 'all') {
            params.delete('status');
        } else {
            params.set('status', status);
        }
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const statusItems = [
        { key: 'all', label: 'All Threads', icon: MessageSquare, count: stats?.threads?.total },
        { key: 'active', label: 'Active', icon: CheckCircle, count: stats?.threads?.active },
        { key: 'pinned', label: 'Pinned', icon: Pin, count: stats?.threads?.pinned },
        { key: 'locked', label: 'Locked', icon: Lock, count: stats?.threads?.locked },
        { key: 'deleted', label: 'Deleted', icon: Trash2, count: stats?.threads?.deleted },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed top-16 left-0 overflow-y-auto hidden lg:block shrink-0 z-40">
            <div className="p-6">
                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search threads..."
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Status Filters */}
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Status</h3>
                <div className="space-y-1">
                    {statusItems.map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentStatus === key
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            onClick={() => handleStatusChange(key)}
                        >
                            <div className="flex items-center gap-3">
                                <Icon size={18} />
                                <span>{label}</span>
                            </div>
                            {count !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${currentStatus === key
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="border-t border-slate-100 my-6"></div>

                {/* Quick Stats */}
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Activity</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">New Threads</span>
                        <span className="font-semibold text-slate-900">{stats?.activity?.threadsToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">New Replies</span>
                        <span className="font-semibold text-slate-900">{stats?.activity?.repliesToday || 0}</span>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-6"></div>

                {/* This Week */}
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">This Week</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Threads</span>
                        <span className="font-semibold text-slate-900">{stats?.activity?.threadsThisWeek || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Replies</span>
                        <span className="font-semibold text-slate-900">{stats?.activity?.repliesThisWeek || 0}</span>
                    </div>
                </div>

                <div className="border-t border-slate-100 my-6"></div>

                {/* Back to Student View */}
                <button
                    onClick={() => router.push('/student/forum')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    <BarChart3 size={18} />
                    <span>View Student Forum</span>
                </button>
            </div>
        </aside>
    );
};

export default ForumSidebar;
