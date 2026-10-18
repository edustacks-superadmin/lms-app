'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Trash2, User } from 'lucide-react';

const CommentSection = ({ postId }) => {
    const { user, role } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select(`
                    *,
                    members (
                        name,
                        photo_url
                    )
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .insert([
                    {
                        post_id: postId,
                        user_id: user.id,
                        content: newComment.trim()
                    }
                ])
                .select(`
                    *,
                    members (
                        name,
                        photo_url
                    )
                `)
                .single();

            if (error) throw error;

            setComments([...comments, data]);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

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

    if (loading) return <div className="p-5 text-center text-sm text-gray-500">Loading comments...</div>;

    return (
        <div className="mt-4 border-t border-gray-200 pt-4 animate-fade-in">
            <h4 className="text-[15px] mb-4 font-semibold text-gray-800">Comments ({comments.length})</h4>

            <div className="flex flex-col gap-4 mb-5 max-h-[400px] overflow-y-auto">
                {comments.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                {comment.members?.photo_url ? (
                                    <img src={comment.members.photo_url} alt={comment.members.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} className="text-gray-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="bg-gray-100 py-2.5 px-3.5 rounded-xl relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm text-gray-900">{comment.members?.name || 'Unknown User'}</span>
                                        <span className="text-[11px] text-gray-500">
                                            {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="m-0 text-sm leading-snug whitespace-pre-wrap text-gray-700">{comment.content}</p>
                                </div>
                                <div className="flex gap-3 mt-1 pl-3 text-[11px]">
                                    {(user?.id === comment.user_id || role === 'admin' || role === 'super_admin') && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="border-none bg-transparent text-red-500 cursor-pointer p-0 font-medium hover:underline"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="flex gap-2.5 items-start">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <User size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows={1}
                            className="w-full py-2.5 px-3.5 pr-10 rounded-full border border-gray-300 resize-none outline-none font-inherit text-sm bg-white min-h-[42px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className={`absolute right-2 top-3 border-none bg-transparent flex items-center justify-center transition-colors ${newComment.trim() ? 'text-teal-500 cursor-pointer' : 'text-gray-300 cursor-default'}`}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-gray-50 p-5 rounded-xl text-center border border-gray-200">
                    <p className="text-gray-600 mb-3 text-sm">Please log in to leave a comment.</p>
                    <a
                        href="/login"
                        className="inline-block py-2 px-5 bg-emerald-500 text-white rounded-lg no-underline font-medium text-sm transition-colors hover:bg-emerald-600"
                    >
                        Log In
                    </a>
                </div>
            )}
        </div>
    );
};

export default CommentSection;
