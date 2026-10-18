'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useInstitute } from '@/context/InstituteContext';
import { supabase } from '@/supabaseClient';
import { MessageCircle, Plus, Pin, Lock, Clock, User, ArrowLeft, Search } from 'lucide-react';

export default function ForumPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { institute } = useInstitute();

    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewThread, setShowNewThread] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (institute?.id) {
            fetchThreads();
        }
    }, [institute]);

    const fetchThreads = async () => {
        try {
            setLoading(true);

            // Fetch threads using client-side Supabase
            const { data: threadsData, error } = await supabase
                .from('discussion_threads')
                .select(`
                    *,
                    members (id, first_name, last_name, photo_url),
                    discussion_replies (id)
                `)
                .eq('institute_id', institute?.id || 10)
                .eq('is_deleted', false)
                .order('is_pinned', { ascending: false })
                .order('last_activity_at', { ascending: false });

            if (error) {
                console.error('Error fetching threads:', error);
                return;
            }

            // Format threads with author info and actual reply count
            const formattedThreads = (threadsData || []).map(thread => ({
                ...thread,
                author: thread.members ? {
                    id: thread.members.id,
                    name: [thread.members.first_name, thread.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: thread.members.photo_url
                } : null,
                // Use actual reply count from joined data
                reply_count: thread.discussion_replies ? thread.discussion_replies.filter(r => !r.is_deleted).length : 0
            }));

            setThreads(formattedThreads);
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;
        if (!user) {
            alert('Please login to create a thread');
            return;
        }

        setSubmitting(true);
        try {
            // First get the member ID for the current user
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select('id')
                .eq('email', user.email)
                .single();

            if (memberError || !memberData) {
                console.error('Error finding member:', memberError);
                alert('Could not find your member profile');
                return;
            }

            // Insert the thread directly using client-side Supabase
            const { data, error } = await supabase
                .from('discussion_threads')
                .insert([{
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    member_id: memberData.id,
                    institute_id: institute?.id || 10,
                    last_activity_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating thread:', error);
                alert(error.message || 'Failed to create thread');
                return;
            }

            setNewTitle('');
            setNewContent('');
            setShowNewThread(false);
            fetchThreads();
        } catch (error) {
            console.error('Error creating thread:', error);
            alert('Failed to create thread');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredThreads = threads.filter(thread =>
        thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Community Forum</h1>
                        <p className="text-sm text-slate-500">Discuss and share with other students</p>
                    </div>
                </div>
                {user && (
                    <button
                        onClick={() => setShowNewThread(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} />
                        New Thread
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* New Thread Form */}
            {showNewThread && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Start a New Discussion</h3>
                    <form onSubmit={handleCreateThread}>
                        <input
                            type="text"
                            placeholder="Thread Title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-3"
                            required
                        />
                        <textarea
                            placeholder="What would you like to discuss?"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none mb-4"
                            required
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowNewThread(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Posting...' : 'Post Thread'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Thread List */}
            <div className="space-y-3">
                {filteredThreads.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                        <MessageCircle size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No discussions yet</p>
                        <p className="text-slate-400 text-sm">Be the first to start a conversation!</p>
                    </div>
                ) : (
                    filteredThreads.map(thread => (
                        <div
                            key={thread.id}
                            onClick={() => router.push(`/student/forum/${thread.id}`)}
                            className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-3">
                                {/* Author Avatar */}
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {thread.author?.photo_url ? (
                                        <img src={thread.author.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} className="text-blue-500" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {thread.is_pinned && (
                                            <Pin size={14} className="text-amber-500" />
                                        )}
                                        {thread.is_locked && (
                                            <Lock size={14} className="text-slate-400" />
                                        )}
                                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                            {thread.title}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                                        {thread.content}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="font-medium text-slate-600">{thread.author?.name || 'Unknown'}</span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle size={12} />
                                            {thread.reply_count || 0} replies
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDate(thread.last_activity_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
