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

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#666' }}>Loading comments...</div>;

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px', animation: 'fadeIn 0.3s ease' }}>
            <h4 style={{ fontSize: '15px', marginBottom: '16px', fontWeight: '600', color: '#333' }}>Comments ({comments.length})</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                {comments.length === 0 ? (
                    <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px' }}>No comments yet. Be the first to share your thoughts!</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                {comment.members?.photo_url ? (
                                    <img src={comment.members.photo_url} alt={comment.members.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={16} color="#888" />
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ backgroundColor: '#f0f2f5', padding: '10px 14px', borderRadius: '12px', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a' }}>{comment.members?.name || 'Unknown User'}</span>
                                        <span style={{ fontSize: '11px', color: '#888' }}>
                                            {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', whiteSpace: 'pre-wrap', color: '#333' }}>{comment.content}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', paddingLeft: '12px', fontSize: '11px' }}>
                                    {(user?.id === comment.user_id || role === 'admin' || role === 'super_admin') && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            style={{ border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer', padding: 0, fontWeight: '500' }}
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {/* Current user avatar placeholder - could fetch from user metadata if available */}
                    <User size={16} color="#888" />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        rows={1}
                        style={{
                            width: '100%',
                            padding: '10px 40px 10px 14px',
                            borderRadius: '20px',
                            border: '1px solid #ddd',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            backgroundColor: '#fff',
                            minHeight: '42px'
                        }}
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
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '12px',
                            border: 'none',
                            background: 'none',
                            color: newComment.trim() ? '#00bfa5' : '#ccc',
                            cursor: newComment.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CommentSection;
