'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Search, Trash2, RefreshCw, Monitor, MapPin, Clock, User } from 'lucide-react';
import { useInstitute } from '../../../context/InstituteContext';

export default function UserSessionsPage() {
    const { institute } = useInstitute();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const limit = 20;

    useEffect(() => {
        fetchSessions();
    }, [page, search]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const offset = page * limit;
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                ...(search && { search }),
                ...(institute?.id && { instituteId: institute.id })
            });

            const response = await fetch(`/api/admin/sessions?${params}`);
            const data = await response.json();

            if (data.sessions) {
                setSessions(data.sessions);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (!confirm('Are you sure you want to force logout this user?')) return;

        try {
            const response = await fetch('/api/admin/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, instituteId: institute?.id })
            });

            if (response.ok) {
                fetchSessions();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeviceIcon = (osName) => {
        if (!osName) return <Monitor size={18} />;
        const os = osName.toLowerCase();
        if (os.includes('android') || os.includes('ios')) return <Monitor size={18} />;
        return <Monitor size={18} />;
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Shield size={28} color="var(--primary-color)" />
                    <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>User Sessions</h1>
                </div>
                <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                    Monitor active user sessions across all devices. Total sessions: {total}
                </p>
            </div>

            {/* Search and Actions */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-light)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by IP or device..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <button
                    onClick={fetchSessions}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Sessions Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    Loading sessions...
                </div>
            ) : sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                    No sessions found
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>User</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>Device</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>IP & Location</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>Login Time</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>Last Active</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => {
                                const location = session.location || {};
                                const locationText = location.city && location.country
                                    ? `${location.city}, ${location.country}`
                                    : location.country || 'Unknown';

                                return (
                                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={16} color="var(--text-light)" />
                                                <div>
                                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                                        {session.member?.first_name} {session.member?.last_name}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                                        {session.member?.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {getDeviceIcon(session.os_name)}
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                                        {session.device_name}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                                        {session.os_name} {session.os_version}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>
                                                    {session.ip_address}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                                                    <MapPin size={12} />
                                                    {locationText}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-color)' }}>
                                                <Clock size={14} color="var(--text-light)" />
                                                {formatDate(session.login_time)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                                                {formatDate(session.last_active)}
                                            </div>
                                            {session.is_current && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    marginTop: '4px',
                                                    padding: '2px 8px',
                                                    backgroundColor: '#dbeafe',
                                                    color: '#1e40af',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '500'
                                                }}>
                                                    Current
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteSession(session.id)}
                                                title="Force logout"
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#dc2626',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {total > limit && (
                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                                Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setPage(Math.max(0, page - 1))}
                                    disabled={page === 0}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        backgroundColor: page === 0 ? '#f3f4f6' : 'white',
                                        cursor: page === 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={(page + 1) * limit >= total}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        backgroundColor: (page + 1) * limit >= total ? '#f3f4f6' : 'white',
                                        cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
