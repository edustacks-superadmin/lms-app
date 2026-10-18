'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Trash2, MessageSquare, ExternalLink, Search, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import PostsSidebar from '../../../components/PostsSidebar';

export default function AdminCommentsPage() {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchComments();
    }, []);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select(`
                    *,
                    members (
                        name,
                        email,
                        photo_url
                    ),
                    posts (
                        id,
                        title,
                        slug
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('post_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

    // Filter comments by search
    const filteredComments = comments.filter(comment => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            comment.content?.toLowerCase().includes(query) ||
            comment.members?.name?.toLowerCase().includes(query) ||
            comment.posts?.title?.toLowerCase().includes(query)
        );
    });

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <PostsSidebar
                    onFilterChange={() => { }}
                    activeStatus="published"
                    onStatusChange={() => { }}
                />
                <main className="lg:ml-64 p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Comments</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{comments.length}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <MessageSquare size={20} className="text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Comment Moderation</h2>
                                <p className="text-slate-500 text-xs mt-0.5">Manage and moderate user comments across all posts</p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search comments..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <button
                                    onClick={fetchComments}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Comments List */}
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : filteredComments.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No comments found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredComments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors group">
                                        {/* Avatar */}
                                        {comment.members?.photo_url ? (
                                            <img
                                                src={comment.members.photo_url}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                                {comment.members?.name?.[0] || '?'}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-slate-900 text-sm">{comment.members?.name || 'Unknown'}</span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(comment.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                                {comment.content}
                                            </p>
                                            {comment.posts && (
                                                <Link
                                                    href={`/posts/${comment.posts.slug || comment.posts.id}`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                                                >
                                                    <span className="truncate max-w-[200px]">on: {comment.posts.title}</span>
                                                    <ExternalLink size={10} className="shrink-0" />
                                                </Link>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Comment"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AdminLayout>
    );
}
