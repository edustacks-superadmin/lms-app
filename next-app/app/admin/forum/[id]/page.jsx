'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Pin,
    Lock,
    Trash2,
    RotateCcw,
    AlertTriangle,
    Clock,
    MessageCircle,
    User
} from 'lucide-react';
import AdminLayout from '../../../../components/AdminLayout';
import { useInstitute } from '../../../../context/InstituteContext';
import { supabase } from '@/supabaseClient';

export default function AdminForumThreadPage() {
    const router = useRouter();
    const params = useParams();
    const { institute } = useInstitute();
    const threadId = params.id;

    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchThread = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch thread with author info
            const { data: threadData, error: threadError } = await supabase
                .from('discussion_threads')
                .select(`
                    *,
                    members (id, first_name, last_name, email, photo_url)
                `)
                .eq('id', threadId)
                .single();

            if (threadError || !threadData) {
                console.error('Error fetching thread:', threadError);
                router.push('/admin/forum');
                return;
            }

            // Fetch all replies (including deleted for admin)
            const { data: repliesData, error: repliesError } = await supabase
                .from('discussion_replies')
                .select(`
                    *,
                    members (id, first_name, last_name, email, photo_url)
                `)
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });

            if (repliesError) {
                console.error('Error fetching replies:', repliesError);
            }

            // Format thread and replies
            const formattedThread = {
                ...threadData,
                author: threadData.members ? {
                    id: threadData.members.id,
                    name: [threadData.members.first_name, threadData.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    email: threadData.members.email,
                    photo_url: threadData.members.photo_url
                } : null,
                replies: (repliesData || []).map(reply => ({
                    ...reply,
                    author: reply.members ? {
                        id: reply.members.id,
                        name: [reply.members.first_name, reply.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                        email: reply.members.email,
                        photo_url: reply.members.photo_url
                    } : null
                })),
                reply_count: (repliesData || []).filter(r => !r.is_deleted).length
            };

            setThread(formattedThread);
        } catch (error) {
            console.error('Failed to fetch thread:', error);
            router.push('/admin/forum');
        } finally {
            setLoading(false);
        }
    }, [threadId, router]);

    useEffect(() => {
        if (threadId) {
            fetchThread();
        }
    }, [threadId, fetchThread]);

    const handleThreadAction = async (action, value) => {
        setActionLoading('thread');
        try {
            let updateData = {};
            switch (action) {
                case 'pin': updateData = { is_pinned: value }; break;
                case 'lock': updateData = { is_locked: value }; break;
                case 'delete': updateData = { is_deleted: true }; break;
                case 'restore': updateData = { is_deleted: false }; break;
                default: throw new Error('Unknown action');
            }

            const { error } = await supabase
                .from('discussion_threads')
                .update(updateData)
                .eq('id', threadId);

            if (error) {
                console.error('Action failed:', error);
                alert(error.message || 'Action failed');
            } else {
                fetchThread();
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleHardDeleteThread = async () => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this thread and all its replies? This cannot be undone.')) {
            return;
        }

        setActionLoading('thread');
        try {
            // Delete replies first
            await supabase.from('discussion_replies').delete().eq('thread_id', threadId);

            // Delete thread
            const { error } = await supabase.from('discussion_threads').delete().eq('id', threadId);

            if (error) {
                console.error('Delete failed:', error);
                alert(error.message || 'Delete failed');
            } else {
                router.push('/admin/forum');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReplyAction = async (replyId, action) => {
        setActionLoading(replyId);
        try {
            let updateData = {};
            switch (action) {
                case 'delete': updateData = { is_deleted: true }; break;
                case 'restore': updateData = { is_deleted: false }; break;
                default: throw new Error('Unknown action');
            }

            const { error } = await supabase
                .from('discussion_replies')
                .update(updateData)
                .eq('id', replyId);

            if (error) {
                console.error('Action failed:', error);
                alert(error.message || 'Action failed');
            } else {
                fetchThread();
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleHardDeleteReply = async (replyId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this reply? This cannot be undone.')) {
            return;
        }

        setActionLoading(replyId);
        try {
            const { error } = await supabase
                .from('discussion_replies')
                .delete()
                .eq('id', replyId);

            if (error) {
                console.error('Delete failed:', error);
                alert(error.message || 'Delete failed');
            } else {
                fetchThread();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!thread) {
        return null;
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-[95%] mx-auto p-8">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/admin/forum')}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-6 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Forum</span>
                    </button>

                    {/* Thread Card */}
                    <div className={`bg-white rounded-xl border shadow-sm mb-6 ${thread.is_deleted ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                        }`}>
                        {/* Thread Header */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Status Badges */}
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
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

                                    <h1 className="text-xl font-bold text-slate-900">{thread.title}</h1>

                                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <User size={14} />
                                            <span>{thread.author?.name || 'Unknown'}</span>
                                            {thread.author?.email && (
                                                <span className="text-slate-400">({thread.author.email})</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={14} />
                                            <span>
                                                {new Date(thread.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle size={14} />
                                            <span>{thread.reply_count || 0} replies</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Thread Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleThreadAction('pin', !thread.is_pinned)}
                                        disabled={actionLoading === 'thread'}
                                        className={`p-2 rounded-lg transition-all ${thread.is_pinned
                                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                            }`}
                                        title={thread.is_pinned ? 'Unpin' : 'Pin'}
                                    >
                                        <Pin size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleThreadAction('lock', !thread.is_locked)}
                                        disabled={actionLoading === 'thread'}
                                        className={`p-2 rounded-lg transition-all ${thread.is_locked
                                            ? 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                            }`}
                                        title={thread.is_locked ? 'Unlock' : 'Lock'}
                                    >
                                        <Lock size={18} />
                                    </button>
                                    {thread.is_deleted ? (
                                        <>
                                            <button
                                                onClick={() => handleThreadAction('restore')}
                                                disabled={actionLoading === 'thread'}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                title="Restore"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                            <button
                                                onClick={handleHardDeleteThread}
                                                disabled={actionLoading === 'thread'}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Permanently"
                                            >
                                                <AlertTriangle size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleThreadAction('delete')}
                                            disabled={actionLoading === 'thread'}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Thread Content */}
                        <div className="p-6">
                            <div className="prose prose-slate max-w-none">
                                <p className="whitespace-pre-wrap">{thread.content}</p>
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">
                                Replies ({thread.replies?.length || 0})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Showing all replies including deleted ones
                            </p>
                        </div>

                        {thread.replies?.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                                <p>No replies yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {thread.replies.map((reply) => (
                                    <div
                                        key={reply.id}
                                        className={`p-4 ${reply.is_deleted ? 'bg-red-50/50' : ''}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            {reply.author?.photo_url ? (
                                                <img
                                                    src={reply.author.photo_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {reply.author?.name?.[0] || '?'}
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-slate-900 text-sm">
                                                        {reply.author?.name || 'Unknown'}
                                                    </span>
                                                    {reply.author?.email && (
                                                        <span className="text-xs text-slate-400">
                                                            ({reply.author.email})
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(reply.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                    {reply.is_deleted && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                            <Trash2 size={10} /> Deleted
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                                    {reply.content}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                {reply.is_deleted ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleReplyAction(reply.id, 'restore')}
                                                            disabled={actionLoading === reply.id}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                            title="Restore"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleHardDeleteReply(reply.id)}
                                                            disabled={actionLoading === reply.id}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Permanently"
                                                        >
                                                            <AlertTriangle size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReplyAction(reply.id, 'delete')}
                                                        disabled={actionLoading === reply.id}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
