import React, { createContext, useContext, useState } from 'react';
import { useInstitute } from './InstituteContext';

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
    const { institute } = useInstitute();

    const fetchTags = async () => {
        if (!institute?.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/tags?institute_id=${institute.id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch tags');
            }

            setTags(data.tags || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTag = async (tagData) => {
        try {
            const response = await fetch('/api/admin/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tagData.name,
                    color: tagData.color || '#2196f3',
                    type: tagData.type || 'all',
                    institute_id: institute?.id
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add tag');
            }

            setTags(prev => [...prev, data.tag]);
            return data.tag;
        } catch (error) {
            console.error('Error adding tag:', error);
            alert(error.message || 'Failed to add tag');
            throw error;
        }
    };

    const updateTag = async (id, tagData) => {
        try {
            const response = await fetch(`/api/admin/tags/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tagData.name,
                    color: tagData.color,
                    type: tagData.type
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update tag');
            }

            setTags(prev => prev.map(tag => tag.id === id ? data.tag : tag));
            return data.tag;
        } catch (error) {
            console.error('Error updating tag:', error);
            alert(error.message || 'Failed to update tag');
            throw error;
        }
    };

    const deleteTag = async (id) => {
        try {
            const response = await fetch(`/api/admin/tags/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete tag');
            }

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
