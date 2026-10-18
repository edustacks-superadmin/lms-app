'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabaseClient';
import { MessageCircle, ArrowLeft, User, Send, Trash2, Pin, Lock, Clock, MoreVertical } from 'lucide-react';

export default function ThreadPage() {
    const router = useRouter();
    const params = useParams();
    const { user, role } = useAuth();
    const threadId = params.id;

    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newReply, setNewReply] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (threadId) {
            fetchThread();
        }
    }, [threadId]);

    const fetchThread = async () => {
        try {
            setLoading(true);

            // Fetch thread using client-side Supabase
            const { data: threadData, error: threadError } = await supabase
                .from('discussion_threads')
                .select(`
                    *,
                    members (id, first_name, last_name, photo_url)
                `)
                .eq('id', threadId)
                .eq('is_deleted', false)
                .single();

            if (threadError || !threadData) {
                console.error('Error fetching thread:', threadError);
                alert('Thread not found');
                router.push('/student/forum');
                return;
            }

            // Format thread with author info
            const formattedThread = {
                ...threadData,
                author: threadData.members ? {
                    id: threadData.members.id,
                    name: [threadData.members.first_name, threadData.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: threadData.members.photo_url
                } : null
            };

            // Fetch replies using client-side Supabase
            const { data: repliesData, error: repliesError } = await supabase
                .from('discussion_replies')
                .select(`
                    *,
                    members (id, first_name, last_name, photo_url)
                `)
                .eq('thread_id', threadId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            if (repliesError) {
                console.error('Error fetching replies:', repliesError);
            }

            // Format replies with author info
            const formattedReplies = (repliesData || []).map(reply => ({
                ...reply,
                author: reply.members ? {
                    id: reply.members.id,
                    name: [reply.members.first_name, reply.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: reply.members.photo_url
                } : null
            }));

            setThread(formattedThread);
            setReplies(formattedReplies);
        } catch (error) {
            console.error('Error fetching thread:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!newReply.trim()) return;
        if (!user) {
            alert('Please login to reply');
            return;
        }

        setSubmitting(true);
        try {
            // Get member ID for the current user
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select('id, first_name, last_name, photo_url')
                .eq('email', user.email)
                .single();

            if (memberError || !memberData) {
                console.error('Error finding member:', memberError);
                alert('Could not find your member profile');
                return;
            }

            // Insert the reply using client-side Supabase
            const { data, error } = await supabase
                .from('discussion_replies')
                .insert([{
                    thread_id: parseInt(threadId),
                    content: newReply.trim(),
                    member_id: memberData.id
                }])
                .select()
                .single();

            if (error) {
                console.error('Error posting reply:', error);
                alert(error.message || 'Failed to post reply');
                return;
            }

            // Add author info to the reply for display
            const newReplyWithAuthor = {
                ...data,
                author: {
                    id: memberData.id,
                    name: [memberData.first_name, memberData.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: memberData.photo_url
                }
            };

            setReplies([...replies, newReplyWithAuthor]);
            setNewReply('');
        } catch (error) {
            console.error('Error posting reply:', error);
            alert('Failed to post reply');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReply = async (replyId) => {
        if (!confirm('Are you sure you want to delete this reply?')) return;

        try {
            // Soft delete using client-side Supabase
            const { error } = await supabase
                .from('discussion_replies')
                .update({ is_deleted: true })
                .eq('id', replyId);

            if (error) {
                console.error('Error deleting reply:', error);
                alert(error.message || 'Failed to delete reply');
                return;
            }

            setReplies(replies.filter(r => r.id !== replyId));
        } catch (error) {
            console.error('Error deleting reply:', error);
        }
    };

    const handleDeleteThread = async () => {
        if (!confirm('Are you sure you want to delete this thread?')) return;

        try {
            const res = await fetch(`/api/forum/threads/${threadId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                router.push('/student/forum');
            } else {
                alert(data.error || 'Failed to delete thread');
            }
        } catch (error) {
            console.error('Error deleting thread:', error);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isAdmin = role === 'admin' || role === 'super_admin';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <p className="text-slate-500">Thread not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {/* Back button */}
            <button
                onClick={() => router.push('/student/forum')}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-4 transition-colors"
            >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Back to Forum</span>
            </button>

            {/* Thread */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-4">
                    {/* Author Avatar */}
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {thread.author?.photo_url ? (
                            <img src={thread.author.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User size={22} className="text-blue-500" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {thread.is_pinned && <Pin size={14} className="text-amber-500" />}
                            {thread.is_locked && <Lock size={14} className="text-slate-400" />}
                            <h1 className="text-xl font-bold text-slate-800">{thread.title}</h1>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                            <span className="font-medium text-slate-700">{thread.author?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {formatDate(thread.created_at)}
                            </span>
                        </div>
                        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {thread.content}
                        </div>
                    </div>

                    {/* Delete button for admin/author */}
                    {(isAdmin || (user && thread.author?.id === user.id)) && (
                        <button
                            onClick={handleDeleteThread}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete thread"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Replies Section */}
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageCircle size={20} />
                    {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </h3>

                {replies.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-200">
                        <p className="text-slate-500">No replies yet. Be the first to respond!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {replies.map(reply => (
                            <div key={reply.id} className="bg-white rounded-xl border border-gray-100 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {reply.author?.photo_url ? (
                                            <img src={reply.author.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={16} className="text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-slate-800">
                                                    {reply.author?.name || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {formatDate(reply.created_at)}
                                                </span>
                                            </div>
                                            {(isAdmin || (user && reply.author?.id === user.id)) && (
                                                <button
                                                    onClick={() => handleDeleteReply(reply.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {reply.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Form */}
            {user && !thread.is_locked && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky bottom-4 shadow-lg">
                    <form onSubmit={handleSubmitReply} className="flex gap-3">
                        <textarea
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            placeholder="Write a reply..."
                            rows={2}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newReply.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 self-end"
                        >
                            <Send size={16} />
                            {submitting ? 'Sending...' : 'Reply'}
                        </button>
                    </form>
                </div>
            )}

            {thread.is_locked && (
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                    <p className="text-amber-700 font-medium flex items-center justify-center gap-2">
                        <Lock size={16} />
                        This thread is locked. No new replies can be added.
                    </p>
                </div>
            )}

            {!user && (
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-slate-600 mb-2">Please log in to reply to this thread.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                        Log In
                    </button>
                </div>
            )}
        </div>
    );
}
