'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MessageSquare,
    MessageCircle,
    Pin,
    Lock,
    Trash2,
    RotateCcw,
    ExternalLink,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import ForumSidebar from '../../../components/ForumSidebar';
import { useInstitute } from '../../../context/InstituteContext';
import { supabase } from '@/supabaseClient';

export default function AdminForumPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { institute } = useInstitute();

    const [threads, setThreads] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [metadata, setMetadata] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [actionLoading, setActionLoading] = useState(null);

    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page')) || 1;

    const fetchStats = useCallback(async () => {
        try {
            const instituteId = institute?.id || 10;
            console.log('Admin Forum - fetching stats for institute:', instituteId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            const weekAgoISO = weekAgo.toISOString();

            // Fetch all threads for this institute
            const { data: threads, error: threadsError } = await supabase
                .from('discussion_threads')
                .select('id, is_deleted, is_pinned, is_locked, created_at, institute_id')
                .eq('institute_id', instituteId);

            // Fetch all replies for threads in this institute
            const { data: replies, error: repliesError } = await supabase
                .from('discussion_replies')
                .select('id, thread_id, is_deleted, created_at');

            console.log('Admin Forum - threads fetched:', threads?.length || 0, 'error:', threadsError);
            console.log('Admin Forum - replies fetched:', replies?.length || 0, 'error:', repliesError);

            if (threadsError) console.error('Error fetching thread stats:', threadsError);
            if (repliesError) console.error('Error fetching reply stats:', repliesError);

            const allThreads = threads || [];
            const allReplies = replies || [];

            // Calculate stats
            const totalThreads = allThreads.length;
            const activeThreads = allThreads.filter(t => !t.is_deleted).length;
            const deletedThreads = allThreads.filter(t => t.is_deleted).length;
            const pinnedThreads = allThreads.filter(t => t.is_pinned && !t.is_deleted).length;
            const lockedThreads = allThreads.filter(t => t.is_locked && !t.is_deleted).length;

            const totalReplies = allReplies.filter(r => !r.is_deleted).length;

            const threadsToday = allThreads.filter(t => new Date(t.created_at) >= today).length;
            const repliesToday = allReplies.filter(r => new Date(r.created_at) >= today).length;
            const threadsThisWeek = allThreads.filter(t => new Date(t.created_at) >= weekAgo).length;
            const repliesThisWeek = allReplies.filter(r => new Date(r.created_at) >= weekAgo).length;

            setStats({
                threads: {
                    total: totalThreads,
                    active: activeThreads,
                    deleted: deletedThreads,
                    pinned: pinnedThreads,
                    locked: lockedThreads
                },
                replies: {
                    total: totalReplies
                },
                activity: {
                    threadsToday,
                    repliesToday,
                    threadsThisWeek,
                    repliesThisWeek
                }
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, [institute?.id]);

    const fetchThreads = useCallback(async () => {
        setLoading(true);
        try {
            const instituteId = institute?.id || 10;

            // Base query
            let query = supabase
                .from('discussion_threads')
                .select(`
                    *,
                    members (id, first_name, last_name, photo_url),
                    discussion_replies (id, is_deleted)
                `)
                .eq('institute_id', instituteId);

            // Apply status filter
            if (status === 'active') {
                query = query.eq('is_deleted', false);
            } else if (status === 'deleted') {
                query = query.eq('is_deleted', true);
            } else if (status === 'pinned') {
                query = query.eq('is_pinned', true).eq('is_deleted', false);
            } else if (status === 'locked') {
                query = query.eq('is_locked', true).eq('is_deleted', false);
            }
            // 'all' shows everything including deleted

            // Order by pinned first, then activity
            query = query
                .order('is_pinned', { ascending: false })
                .order('last_activity_at', { ascending: false });

            const { data: threadsData, error } = await query;

            if (error) {
                console.error('Error fetching threads:', error);
                return;
            }

            // Filter by search query if provided
            let filteredThreads = threadsData || [];
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                filteredThreads = filteredThreads.filter(t =>
                    t.title.toLowerCase().includes(lowerQuery) ||
                    t.content.toLowerCase().includes(lowerQuery)
                );
            }

            // Format threads
            const formattedThreads = filteredThreads.map(thread => ({
                ...thread,
                author: thread.members ? {
                    id: thread.members.id,
                    name: [thread.members.first_name, thread.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: thread.members.photo_url
                } : null,
                reply_count: thread.discussion_replies ? thread.discussion_replies.filter(r => !r.is_deleted).length : 0
            }));

            // Pagination (client-side for simplicity)
            const limit = 20;
            const startIndex = (page - 1) * limit;
            const paginatedThreads = formattedThreads.slice(startIndex, startIndex + limit);

            setThreads(paginatedThreads);
            setMetadata({
                total: formattedThreads.length,
                page,
                limit,
                totalPages: Math.ceil(formattedThreads.length / limit)
            });
        } catch (error) {
            console.error('Failed to fetch threads:', error);
        } finally {
            setLoading(false);
        }
    }, [institute?.id, status, page, searchQuery]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchThreads();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchThreads]);

    const handleAction = async (threadId, action, value) => {
        setActionLoading(threadId);
        try {
            let updateData = {};

            switch (action) {
                case 'pin':
                    updateData = { is_pinned: value };
                    break;
                case 'lock':
                    updateData = { is_locked: value };
                    break;
                case 'delete':
                    updateData = { is_deleted: true };
                    break;
                case 'restore':
                    updateData = { is_deleted: false };
                    break;
                default:
                    throw new Error('Unknown action');
            }

            const { error } = await supabase
                .from('discussion_threads')
                .update(updateData)
                .eq('id', threadId);

            if (error) {
                console.error('Action failed:', error);
                alert(error.message || 'Action failed');
            } else {
                fetchThreads();
                fetchStats();
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleHardDelete = async (threadId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this thread? This cannot be undone.')) {
            return;
        }

        setActionLoading(threadId);
        try {
            // First delete all replies
            const { error: repliesError } = await supabase
                .from('discussion_replies')
                .delete()
                .eq('thread_id', threadId);

            if (repliesError) {
                console.error('Error deleting replies:', repliesError);
            }

            // Then delete the thread
            const { error } = await supabase
                .from('discussion_threads')
                .delete()
                .eq('id', threadId);

            if (error) {
                console.error('Delete failed:', error);
                alert(error.message || 'Delete failed');
            } else {
                fetchThreads();
                fetchStats();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`/admin/forum?${params.toString()}`);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <ForumSidebar
                    stats={stats}
                    onSearch={setSearchQuery}
                    searchQuery={searchQuery}
                />
                <main className="lg:ml-64 p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Threads</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.threads?.total || 0}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <MessageSquare size={20} className="text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Replies</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.replies?.total || 0}</p>
                            </div>
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                                <MessageCircle size={20} className="text-green-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Today's Activity</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {(stats?.activity?.threadsToday || 0) + (stats?.activity?.repliesToday || 0)}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                <RefreshCw size={20} className="text-purple-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Pinned</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.threads?.pinned || 0}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Pin size={20} className="text-amber-600" />
                            </div>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Forum Moderation</h2>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Manage discussion threads and moderate content
                                </p>
                            </div>
                            <button
                                onClick={() => { fetchThreads(); fetchStats(); }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Refresh"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Thread List */}
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No threads found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors group ${thread.is_deleted ? 'bg-red-50/50' : ''
                                            }`}
                                    >
                                        {/* Avatar */}
                                        {thread.author?.photo_url ? (
                                            <img
                                                src={thread.author.photo_url}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                                {thread.author?.name?.[0] || '?'}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {thread.is_pinned && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                                        <Pin size={10} /> Pinned
                                                    </span>
                                                )}
                                                {thread.is_locked && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                                        <Lock size={10} /> Locked
                                                    </span>
                                                )}
                                                {thread.is_deleted && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                        <Trash2 size={10} /> Deleted
                                                    </span>
                                                )}
                                            </div>
                                            <Link
                                                href={`/admin/forum/${thread.id}`}
                                                className="font-medium text-slate-900 hover:text-blue-600 text-sm line-clamp-1"
                                            >
                                                {thread.title}
                                            </Link>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                                {thread.content}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                <span>by {thread.author?.name || 'Unknown'}</span>
                                                <span>•</span>
                                                <span>{thread.reply_count || 0} replies</span>
                                                <span>•</span>
                                                <span>
                                                    {new Date(thread.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/student/forum/${thread.id}`}
                                                target="_blank"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="View in Forum"
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleAction(thread.id, 'pin', !thread.is_pinned)}
                                                disabled={actionLoading === thread.id}
                                                className={`p-2 rounded-lg transition-all ${thread.is_pinned
                                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                                    : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                    }`}
                                                title={thread.is_pinned ? 'Unpin' : 'Pin'}
                                            >
                                                <Pin size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleAction(thread.id, 'lock', !thread.is_locked)}
                                                disabled={actionLoading === thread.id}
                                                className={`p-2 rounded-lg transition-all ${thread.is_locked
                                                    ? 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                title={thread.is_locked ? 'Unlock' : 'Lock'}
                                            >
                                                <Lock size={16} />
                                            </button>
                                            {thread.is_deleted ? (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(thread.id, 'restore')}
                                                        disabled={actionLoading === thread.id}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleHardDelete(thread.id)}
                                                        disabled={actionLoading === thread.id}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Permanently"
                                                    >
                                                        <AlertTriangle size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(thread.id, 'delete')}
                                                    disabled={actionLoading === thread.id}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {metadata.totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500">
                                    Page {metadata.page} of {metadata.totalPages} • {metadata.total} total threads
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page <= 1}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page >= metadata.totalPages}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AdminLayout>
    );
}
