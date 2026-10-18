'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Trophy, TrendingUp, Download, Calendar, RefreshCw } from 'lucide-react';

const SettingsStatistics = () => {
    const [period, setPeriod] = useState('week');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('topTests');
    const [stats, setStats] = useState({
        totalAttempts: 0,
        chart: { labels: [], data: [] },
        topTests: [],
        topTestTakers: [],
        topScorers: []
    });
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const fetchStats = async () => {
        setLoading(true);
        try {
            let url = `/api/statistics/exams?period=${period}`;
            if (period === 'custom' && customRange.start && customRange.end) {
                url = `/api/statistics/exams?startDate=${customRange.start}&endDate=${customRange.end}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [period]);

    // Simple line chart using SVG
    const chartMaxValue = useMemo(() => Math.max(...stats.chart.data, 1), [stats.chart.data]);
    const chartPoints = useMemo(() => {
        if (stats.chart.data.length === 0) return '';
        const width = 800;
        const height = 200;
        const padding = 40;
        const points = stats.chart.data.map((value, index) => {
            const x = padding + (index * (width - 2 * padding)) / Math.max(stats.chart.data.length - 1, 1);
            const y = height - padding - ((value / chartMaxValue) * (height - 2 * padding));
            return `${x},${y}`;
        }).join(' ');
        return points;
    }, [stats.chart.data, chartMaxValue]);

    const periodLabel = period === 'week' ? 'Week' : period === 'month' ? 'Month' : period === 'year' ? 'Year' : 'Custom';

    const exportToExcel = () => {
        // Create CSV data
        let csv = 'Test Report\n\n';
        csv += `Period: ${periodLabel}\n`;
        csv += `Total Tests: ${stats.totalAttempts}\n\n`;

        csv += 'Top Tests\nNo,Title,Attempts Count\n';
        stats.topTests.forEach((test, i) => {
            csv += `${i + 1},${test.title},${test.attempts}\n`;
        });

        csv += '\nTop Test Takers\nNo,User,Attempts Count\n';
        stats.topTestTakers.forEach((user, i) => {
            csv += `${i + 1},${user.name},${user.attempts}\n`;
        });

        csv += '\nTop Scorers\nNo,User,Total Score\n';
        stats.topScorers.forEach((user, i) => {
            csv += `${i + 1},${user.name},${user.totalScore.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="flex-1 p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Test Report</h2>
                    <p className="text-slate-500 text-sm mt-1">Exam statistics and analytics</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Download size={16} />
                    Export as Excel
                </button>
            </div>

            {/* Period Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {['week', 'month', 'year'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === p
                                        ? 'bg-cyan-500 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={16} />
                        <span>Select date range</span>
                    </div>

                    <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button
                        onClick={() => { setPeriod('custom'); fetchStats(); }}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700"
                    >
                        Apply
                    </button>

                    <button
                        onClick={fetchStats}
                        className="p-2 text-slate-500 hover:text-slate-700 ml-auto"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Total Count */}
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3">
                    <TrendingUp size={24} />
                    <span className="text-lg opacity-90">Total Number of Tests this {periodLabel}</span>
                </div>
                <div className="text-4xl font-bold mt-2">
                    {loading ? '...' : stats.totalAttempts.toLocaleString()}
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChart2 size={18} />
                    Test Activity Over Time
                </h3>
                {loading ? (
                    <div className="h-[220px] flex items-center justify-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin" />
                    </div>
                ) : stats.chart.data.length === 0 ? (
                    <div className="h-[220px] flex items-center justify-center text-slate-400">
                        No data available for this period
                    </div>
                ) : (
                    <div className="relative">
                        <svg viewBox="0 0 800 250" className="w-full h-[220px]">
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4].map((i) => (
                                <line
                                    key={i}
                                    x1="40"
                                    y1={40 + i * 40}
                                    x2="760"
                                    y2={40 + i * 40}
                                    stroke="#e2e8f0"
                                    strokeWidth="1"
                                />
                            ))}
                            {/* Line chart */}
                            <polyline
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="3"
                                points={chartPoints}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            {/* Data points */}
                            {stats.chart.data.map((value, index) => {
                                const x = 40 + (index * 720) / Math.max(stats.chart.data.length - 1, 1);
                                const y = 200 - ((value / chartMaxValue) * 160);
                                return (
                                    <circle
                                        key={index}
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill="#06b6d4"
                                        stroke="white"
                                        strokeWidth="2"
                                    />
                                );
                            })}
                            {/* X-axis labels */}
                            {stats.chart.labels.map((label, index) => {
                                const x = 40 + (index * 720) / Math.max(stats.chart.labels.length - 1, 1);
                                return (
                                    <text
                                        key={index}
                                        x={x}
                                        y="230"
                                        textAnchor="middle"
                                        className="fill-slate-500 text-xs"
                                    >
                                        {label}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('topTests')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'topTests'
                                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Top Tests
                        </button>
                        <button
                            onClick={() => setActiveTab('topTakers')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'topTakers'
                                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Top Test Takers
                        </button>
                        <button
                            onClick={() => setActiveTab('topScorers')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'topScorers'
                                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Top Scorers
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <RefreshCw size={24} className="animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Top Tests Tab */}
                            {activeTab === 'topTests' && (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-500 text-sm">
                                            <th className="pb-3 font-medium w-16">No</th>
                                            <th className="pb-3 font-medium">Title</th>
                                            <th className="pb-3 font-medium text-right">Attempts Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.topTests.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-400">
                                                    No tests attempted in this period
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.topTests.map((test, i) => (
                                                <tr key={test.id} className="border-t border-slate-100">
                                                    <td className="py-3 text-slate-600">{i + 1}</td>
                                                    <td className="py-3 text-cyan-600 font-medium">{test.title}</td>
                                                    <td className="py-3 text-right text-slate-700">{test.attempts}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Top Test Takers Tab */}
                            {activeTab === 'topTakers' && (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-500 text-sm">
                                            <th className="pb-3 font-medium w-16">No</th>
                                            <th className="pb-3 font-medium">User</th>
                                            <th className="pb-3 font-medium text-right">Attempts Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.topTestTakers.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-400">
                                                    No test takers in this period
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.topTestTakers.map((user, i) => (
                                                <tr key={user.id} className="border-t border-slate-100">
                                                    <td className="py-3 text-slate-600">{i + 1}</td>
                                                    <td className="py-3 text-slate-800 font-medium flex items-center gap-2">
                                                        <Users size={16} className="text-slate-400" />
                                                        {user.name}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-700">{user.attempts}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Top Scorers Tab */}
                            {activeTab === 'topScorers' && (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-500 text-sm">
                                            <th className="pb-3 font-medium w-16">No</th>
                                            <th className="pb-3 font-medium">User</th>
                                            <th className="pb-3 font-medium text-right">Total Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.topScorers.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-slate-400">
                                                    No scores recorded in this period
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.topScorers.map((user, i) => (
                                                <tr key={user.id} className="border-t border-slate-100">
                                                    <td className="py-3 text-slate-600">{i + 1}</td>
                                                    <td className="py-3 text-slate-800 font-medium flex items-center gap-2">
                                                        <Trophy size={16} className="text-amber-500" />
                                                        {user.name}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-700 font-mono">
                                                        {user.totalScore.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsStatistics;
