import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const TagContext = createContext();

export const useTags = () => {
    const context = useContext(TagContext);
    if (!context) {
        throw new Error('useTags must be used within a TagProvider');
    }
    return context;
};

export const TagProvider = ({ children }) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const publicAuthPaths = ['/login', '/student/signup', '/forgot-password', '/reset-password'];
        if (publicAuthPaths.includes(window.location.pathname)) {
            setLoading(false);
            return;
        }
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tags')
                .select('*')
                .order('name');

            if (error) throw error;
            setTags(data || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
            alert('Failed to fetch tags');
        } finally {
            setLoading(false);
        }
    };

    const addTag = async (tagData) => {
        try {
            const { data, error } = await supabase
                .from('tags')
                .insert([{
                    name: tagData.name,
                    color: tagData.color || '#2196f3'
                }])
                .select()
                .single();

            if (error) throw error;
            setTags(prev => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error adding tag:', error);
            alert(error.message || 'Failed to add tag');
            throw error;
        }
    };

    const updateTag = async (id, tagData) => {
        try {
            const { data, error } = await supabase
                .from('tags')
                .update({
                    name: tagData.name,
                    color: tagData.color,
                    updated_at: new Date()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setTags(prev => prev.map(tag => tag.id === id ? data : tag));
            return data;
        } catch (error) {
            console.error('Error updating tag:', error);
            alert(error.message || 'Failed to update tag');
            throw error;
        }
    };

    const deleteTag = async (id) => {
        try {
            const { error } = await supabase
                .from('tags')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTags(prev => prev.filter(tag => tag.id !== id));
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert('Failed to delete tag');
            throw error;
        }
    };

    const getTagById = (id) => {
        return tags.find(tag => tag.id === id);
    };

    const value = {
        tags,
        loading,
        fetchTags,
        addTag,
        updateTag,
        deleteTag,
        getTagById
    };

    return (
        <TagContext.Provider value={value}>
            {children}
        </TagContext.Provider>
    );
};
