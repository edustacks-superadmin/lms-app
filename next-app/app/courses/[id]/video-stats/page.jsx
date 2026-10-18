'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function VideoStatsPage({ params }) {
    const { id } = React.use(params);
    const courseId = id;
    const [stats, setStats] = useState([]);
    const [totalVideos, setTotalVideos] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [courseId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats || []);
                setTotalVideos(data.totalVideos || 0);
            }
        } catch (error) {
            console.error('Error fetching video stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (memberId, studentName) => {
        if (!confirm(`Are you sure you want to reset video stats for ${studentName}?`)) {
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ memberId })
            });

            if (response.ok) {
                alert('Stats reset successfully!');
                fetchStats();
            } else {
                alert('Failed to reset stats');
            }
        } catch (error) {
            console.error('Error resetting stats:', error);
            alert('Failed to reset stats');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BarChart3 className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Students Video Watched Statistics</h1>
                        <p className="text-gray-500">This course has a total of {totalVideos} videos</p>
                    </div>
                </div>
            </div>

            {/* Stats Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Video Watch Minutes</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Overall Video Watch Progress</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No student data available
                                    </td>
                                </tr>
                            ) : (
                                stats.map((student, index) => (
                                    <tr key={student.member_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-semibold text-gray-800">{student.name || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{student.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-800">
                                                {student.total_watch_minutes} mins
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${student.progress_percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700 min-w-[40px]">
                                                    {student.progress_percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleReset(student.member_id, student.name || student.email)}
                                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                                Reset
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Back Link */}
            <div className="mt-6">
                <Link
                    href="/admin"
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                    ← Back to Admin Dashboard
                </Link>
            </div>
        </div>
    );
}
