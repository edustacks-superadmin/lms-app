'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Users, Clock, PlayCircle, Award, Calendar, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Search, Download } from 'lucide-react';

const VideoStatistics = () => {
    const params = useParams();
    const { examId } = params;
    const contentId = params?.contentId || params?.id; // Attempt to get contentId or fallback to id
    const courseId = params?.courseId;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState(null);
    const [views, setViews] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [stats, setStats] = useState({
        totalViews: 0,
        completedViews: 0,
        completionRate: 0,
        averageProgress: 0
    });

    useEffect(() => {
        fetchVideoStatistics();
    }, [contentId]);

    const fetchVideoStatistics = async () => {
        try {
            setLoading(true);

            // Fetch content details from chapter_contents
            const { data: contentData, error: contentError } = await supabase
                .from('chapter_contents')
                .select('*, chapters(title, course_id)')
                .eq('id', contentId)
                .single();

            if (contentError) throw contentError;
            setContent(contentData);

            // Fetch all views for this video from content_progress
            const { data: progressData, error: progressError } = await supabase
                .from('content_progress')
                .select('*')
                .eq('content_id', contentId)
                .eq('content_type', 'video')
                .order('created_at', { ascending: false });

            if (progressError) {
                console.error('Error fetching progress:', progressError);
                throw progressError;
            }

            // Fetch member details for these views
            let viewsWithMembers = [];
            if (progressData && progressData.length > 0) {
                const studentIds = [...new Set(progressData.map(p => p.student_id))];

                const { data: membersData, error: membersError } = await supabase
                    .from('members')
                    .select('id, name, email')
                    .in('id', studentIds);

                if (membersError) {
                    console.error('Error fetching members:', membersError);
                }

                viewsWithMembers = progressData.map(progress => {
                    const member = membersData?.find(m => m.id === progress.student_id);
                    return {
                        ...progress,
                        student_name: member?.name || 'Unknown',
                        student_email: member?.email || 'N/A'
                    };
                });
            }

            setViews(viewsWithMembers);

            // Calculate statistics
            const totalViews = viewsWithMembers.length;
            const completedViews = viewsWithMembers.filter(v => v.completed).length;
            const completionRate = totalViews > 0 ? ((completedViews / totalViews) * 100).toFixed(1) : 0;
            const averageProgress = totalViews > 0
                ? (viewsWithMembers.reduce((sum, v) => sum + (v.completion_percentage || 0), 0) / totalViews).toFixed(1)
                : 0;

            setStats({
                totalViews,
                completedViews,
                completionRate,
                averageProgress
            });

        } catch (error) {
            console.error('Error fetching video statistics:', error);
            alert('Error loading video statistics: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedViews = () => {
        let sortedViews = [...views];

        if (sortConfig.key) {
            sortedViews.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'created_at' || sortConfig.key === 'completed_at') {
                    aValue = new Date(aValue || 0);
                    bValue = new Date(bValue || 0);
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sortedViews;
    };

    const getFilteredViews = () => {
        const sortedViews = getSortedViews();
        if (!searchQuery) return sortedViews;

        return sortedViews.filter(view =>
            view.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            view.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const exportToCSV = () => {
        const headers = ['Student Name', 'Email', 'Started', 'Completed', 'Progress %', 'Completion Date'];
        const rows = getFilteredViews().map(view => [
            view.student_name,
            view.student_email,
            new Date(view.created_at).toLocaleString(),
            view.completed ? 'Yes' : 'No',
            view.completion_percentage || 0,
            view.completed_at ? new Date(view.completed_at).toLocaleString() : 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-statistics-${content?.title || 'video'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} color="#999" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} color="#2563eb" />
            : <ArrowDown size={14} color="#2563eb" />;
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading video statistics...</p>
            </div>
        );
    }

    const filteredViews = getFilteredViews();

    return (
        <div style={{ flex: 1, padding: '20px', fontFamily: "'Inter', sans-serif" }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <button
                    onClick={() => navigate(`/courses/${courseId}/chapters`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: '#666' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <span style={{ color: '#666' }}>Course Chapters</span>
                <span style={{ color: '#ccc' }}>/</span>
                <span style={{ color: '#111', fontWeight: '600' }}>Video Statistics</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#666' }}>
                    <ArrowLeft size={20} color="#666" /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <PlayCircle size={32} color="#2563eb" />
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{content?.title || 'Video Statistics'}</h1>
                </div>
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>View detailed statistics for this video content</p>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Views</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>{stats.totalViews}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Completed</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.completedViews}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Completion Rate</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.completionRate}%</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Avg Progress</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.averageProgress}%</div>
                </div>
            </div>

            {/* Search and Export */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <input
                            type="text"
                            placeholder="Search by student name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                paddingLeft: '40px',
                                paddingRight: '12px',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                width: '100%',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        disabled={filteredViews.length === 0}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: filteredViews.length === 0 ? '#f5f5f5' : '#2563eb',
                            color: filteredViews.length === 0 ? '#999' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: filteredViews.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Views Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th
                                    onClick={() => handleSort('student_name')}
                                    style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Student <SortIcon columnKey="student_name" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('created_at')}
                                    style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Started <SortIcon columnKey="created_at" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('completion_percentage')}
                                    style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Progress <SortIcon columnKey="completion_percentage" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('completed')}
                                    style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Status <SortIcon columnKey="completed" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('completed_at')}
                                    style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Completed Date <SortIcon columnKey="completed_at" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredViews.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                        {searchQuery ? 'No matching views found' : 'No one has viewed this video yet'}
                                    </td>
                                </tr>
                            ) : (
                                filteredViews.map((view, index) => (
                                    <tr key={view.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#111' }}>{view.student_name}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{view.student_email}</div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {new Date(view.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    flex: 1,
                                                    height: '8px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    maxWidth: '100px'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        backgroundColor: view.completed ? '#10b981' : '#3b82f6',
                                                        width: `${view.completion_percentage || 0}%`,
                                                        transition: 'width 0.3s'
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', minWidth: '45px' }}>
                                                    {view.completion_percentage || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {view.completed ? (
                                                    <>
                                                        <CheckCircle size={18} color="#10b981" />
                                                        <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '500' }}>Completed</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlayCircle size={18} color="#f59e0b" />
                                                        <span style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '500' }}>In Progress</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                                            {view.completed_at
                                                ? new Date(view.completed_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })
                                                : '—'
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VideoStatistics;
