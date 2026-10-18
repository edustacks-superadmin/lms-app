'use client';

import { useEffect, useState } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';

export default function BackgroundTasksPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // In production, this would fetch from an API that lists all jobs
    // For now, showing placeholder structure
    useEffect(() => {
        // Placeholder - in real implementation would call API
        setJobs([]);
    }, []);

    const getStatusBadge = (status) => {
        const styles = {
            completed: { backgroundColor: '#10b981', color: 'white' },
            running: { backgroundColor: '#3b82f6', color: 'white' },
            failed: { backgroundColor: '#ef4444', color: 'white' },
            pending: { backgroundColor: '#f59e0b', color: 'white' }
        };

        const labels = {
            completed: 'Succeeded',
            running: 'Running',
            failed: 'Failed',
            pending: 'Pending'
        };

        return (
            <span style={{
                ...styles[status],
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
            }}>
                {labels[status] || status}
            </span>
        );
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                    Background Tasks
                </h1>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                alignItems: 'center'
            }}>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Search
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Filter by status
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    >
                        <option value="all">All</option>
                        <option value="completed">Succeeded</option>
                        <option value="running">Running</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>

                <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Sort by
                    </label>
                    <select
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px'
                        }}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                Name
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                Status
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                                Completed On
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '48px 16px', textAlign: 'center' }}>
                                    <div style={{ color: '#9ca3af' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                                        <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                                            No background tasks yet
                                        </div>
                                        <div style={{ fontSize: '14px' }}>
                                            Start an import from Testpress to see tasks here
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr key={job.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                            {job.type === 'courses-sync' ? 'Testpress Course Import' : 'Testpress Batch Import'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                                            STARTED: {formatDate(job.createdAt)}
                                        </div>
                                        {job.progress && job.status === 'running' && (
                                            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                                                PROGRESS: {job.progress.current}/{job.progress.total}
                                            </div>
                                        )}
                                        {job.error && (
                                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                                                ERROR: {job.error}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {getStatusBadge(job.status)}
                                        {job.results && job.status === 'completed' && (
                                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                                {job.results.imported} imported, {job.results.updated} updated
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                                        {job.status === 'completed' ? formatDate(job.updatedAt) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info Box */}
            <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px'
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
                    💡 Available Background Tasks
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
                    <li>Testpress Batch Import - Import batches from Testpress</li>
                    <li>Testpress Course Import - Import courses with batch relationships</li>
                </ul>
            </div>
        </div>
    );
}
