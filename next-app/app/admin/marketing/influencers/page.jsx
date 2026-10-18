'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, Download, RefreshCw, Search, TrendingUp } from 'lucide-react';
import AdminLayout from '../../../../components/AdminLayout';
import AdminStoreSidebar from '../../../../components/AdminStoreSidebar';
import { useInstitute } from '../../../../context/InstituteContext';

const InfluencerReportPage = () => {
    const router = useRouter();
    const { institute } = useInstitute();
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (institute?.id) {
            fetchReport();
        }
    }, [institute?.id]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/reports/influencers?instituteId=${institute?.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setReportData(data);
            }
        } catch (error) {
            console.error('Failed to load report:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Influencer Name', 'Email', 'Coupon Code', 'Total Sales', 'Total Revenue', 'Commission Type', 'Commission Amount'];
        const rows = reportData.map(row => [
            row.influencer_name,
            row.influencer_email || '-',
            row.coupon_code,
            row.total_sales_count,
            row.total_revenue,
            row.commission_fixed > 0 ? `Flat ₹${row.commission_fixed}` : `${row.commission_percent}%`,
            row.total_commission
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "influencer_report.csv");
        document.body.appendChild(link);
        link.click();
    };

    const totalRevenue = reportData.reduce((sum, item) => sum + item.total_revenue, 0);
    const totalCommission = reportData.reduce((sum, item) => sum + item.total_commission, 0);

    // Search filter
    const filteredData = reportData.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.influencer_name?.toLowerCase().includes(query) ||
            item.coupon_code?.toLowerCase().includes(query)
        );
    });

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <AdminStoreSidebar />
                <main className="lg:ml-64 p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Influencers</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.length}</p>
                            </div>
                            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                                <Users size={20} className="text-violet-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Revenue</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <TrendingUp size={20} className="text-emerald-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Commission Due</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">₹{totalCommission.toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                <DollarSign size={20} className="text-amber-600" />
                            </div>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Influencer Reports</h2>
                                <p className="text-slate-500 text-xs mt-0.5">Track affiliate performance and calculate payouts</p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search influencers..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <button
                                    onClick={fetchReport}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium whitespace-nowrap"
                                >
                                    <Download size={16} />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <Users size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No influencer data found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Influencer</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Coupon Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission Rule</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{item.influencer_name}</div>
                                                    <div className="text-xs text-slate-500">{item.influencer_email || 'No email linked'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-xs font-semibold">
                                                        {item.coupon_code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-medium">{item.total_sales_count}</td>
                                                <td className="px-6 py-4 text-slate-600">₹{item.total_revenue.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">
                                                    {item.commission_fixed > 0 ? `Flat ₹${item.commission_fixed}` : `${item.commission_percent}% per sale`}
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                                                    ₹{item.total_commission.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AdminLayout>
    );
};

export default InfluencerReportPage;
