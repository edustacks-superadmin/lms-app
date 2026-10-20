import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PostContext = createContext();

export const usePosts = () => {
    const context = useContext(PostContext);
    if (!context) {
        throw new Error('usePosts must be used within a PostProvider');
    }
    return context;
};

export const PostProvider = ({ children }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            let { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    categories (
                        name,
                        color
                    ),
                    post_batches (
                        batch_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Full join failed, attempting fallback query:', error.message);
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fallbackError) throw fallbackError;
                data = fallbackData || [];
            }

            // Transform data to match UI requirements
            const formattedPosts = data.map(post => ({
                ...post,
                tag: post.categories?.name || 'Uncategorized',
                tagColor: post.categories?.color || '#999',
                batches: post.post_batches?.map(pb => pb.batch_id) || [],
                allowedProducts: post.allowed_products || [],
                date: new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                })
            }));

            setPosts(formattedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addPost = async (postData) => {
        try {
            const newPost = {
                title: postData.title,
                description: postData.description, // keeping description for backward compatibility or list view
                summary: postData.summary,
                content: postData.content,
                cover_image: postData.coverImage,
                product_name: postData.productName,
                access_control: postData.accessControl,
                allow_comments: postData.allowComments,
                publication_date: postData.publicationDate,
                icon: postData.icon,
                category_id: postData.categoryId,
                allowed_products: postData.allowedProducts || []
            };

            // 1. Insert Post
            const { data: post, error: postError } = await supabase
                .from('posts')
                .insert([newPost])
                .select(`
                    *,
                    categories (
                        name,
                        color
                    )
                `)
                .single();

            if (postError) throw postError;

            // 2. Insert Batch Associations if any
            if (postData.batches && postData.batches.length > 0) {
                const batchInserts = postData.batches.map(batchId => ({
                    post_id: post.id,
                    batch_id: batchId
                }));

                const { error: batchError } = await supabase
                    .from('post_batches')
                    .insert(batchInserts);

                if (batchError) throw batchError;
            }

            const formattedPost = {
                ...post,
                tag: post.categories?.name || 'Uncategorized',
                tagColor: post.categories?.color || '#999',
                date: new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                })
            };

            setPosts(prev => [formattedPost, ...prev]);
            return formattedPost;
        } catch (error) {
            console.error('Error adding post:', error.message);
            alert('Error adding post: ' + error.message);
            throw error; // Re-throw to handle in component
        }
    };

    const deletePost = async (id) => {
        try {
            const { error } = await supabase
                .from('posts')
                .update({ is_deleted: true })
                .eq('id', id);

            if (error) throw error;

            // Update local state to reflect change (PostList filters will handle moving it to 'deleted' tab)
            setPosts(prev => prev.map(post =>
                post.id === id ? { ...post, is_deleted: true } : post
            ));
            return { success: true };
        } catch (error) {
            console.error('Error deleting post:', error.message);
            alert('Failed to delete post: ' + error.message);
            return { success: false, error: error.message };
        }
    };

    const restorePost = async (id) => {
        try {
            const { error } = await supabase
                .from('posts')
                .update({ is_deleted: false })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setPosts(prev => prev.map(post =>
                post.id === id ? { ...post, is_deleted: false } : post
            ));
        } catch (error) {
            console.error('Error restoring post:', error.message);
            throw error;
        }
    };

    const getPostById = async (id) => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    categories (
                        name,
                        color
                    ),
                    post_batches (
                        batch_id
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Transform data
            return {
                ...data,
                tag: data.categories?.name || 'Uncategorized',
                tagColor: data.categories?.color || '#999',
                batches: data.post_batches?.map(pb => pb.batch_id) || [],
                allowedProducts: data.allowed_products || []
            };
        } catch (error) {
            console.error('Error fetching post:', error.message);
            return null;
        }
    };

    const updatePost = async (id, postData) => {
        try {
            const updatedPost = {
                title: postData.title,
                description: postData.description,
                summary: postData.summary,
                content: postData.content,
                cover_image: postData.coverImage,
                product_name: postData.productName,
                access_control: postData.accessControl,
                allow_comments: postData.allowComments,
                publication_date: postData.publicationDate,
                icon: postData.icon,
                category_id: postData.categoryId,
                allowed_products: postData.allowedProducts || []
            };

            // 1. Update Post
            const { data: post, error: postError } = await supabase
                .from('posts')
                .update(updatedPost)
                .eq('id', id)
                .select(`
                    *,
                    categories (
                        name,
                        color
                    )
                `)
                .single();

            if (postError) throw postError;

            // 2. Update Batch Associations
            // First delete existing
            const { error: deleteError } = await supabase
                .from('post_batches')
                .delete()
                .eq('post_id', id);

            if (deleteError) throw deleteError;

            // Then insert new
            if (postData.batches && postData.batches.length > 0) {
                const batchInserts = postData.batches.map(batchId => ({
                    post_id: id,
                    batch_id: batchId
                }));

                const { error: batchError } = await supabase
                    .from('post_batches')
                    .insert(batchInserts);

                if (batchError) throw batchError;
            }

            const formattedPost = {
                ...post,
                tag: post.categories?.name || 'Uncategorized',
                tagColor: post.categories?.color || '#999',
                date: new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                })
            };

            setPosts(prev => prev.map(p => p.id === id ? formattedPost : p));
            return formattedPost;
        } catch (error) {
            console.error('Error updating post:', error.message);
            alert('Error updating post: ' + error.message);
            throw error;
        }
    };

    return (
        <PostContext.Provider value={{ posts, loading, addPost, deletePost, restorePost, getPostById, updatePost }}>
            {children}
        </PostContext.Provider>
    );
};
