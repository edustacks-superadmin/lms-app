import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { institute } = useInstitute();

    useEffect(() => {
        fetchCategories(institute?.id);
    }, [institute?.id]);

    const resolveInstituteId = async (providedId) => {
        if (providedId) return providedId;
        if (institute?.id) return institute.id;
        try {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const slug = parts.length > 2 ? parts[0].toLowerCase() : 'maheshiesacademy';
            const { data } = await supabase
                .from('institute_settings')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();
            if (data?.id) return data.id;
        } catch (e) {
            console.warn('Error resolving institute id for category:', e);
        }
        return 10;
    };

    const fetchCategories = async (targetInstituteId) => {
        setLoading(true);
        try {
            const instId = await resolveInstituteId(targetInstituteId);

            let query = supabase
                .from('categories')
                .select('*')
                .order('created_at', { ascending: true });

            if (instId) {
                query = query.eq('institute_id', instId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch post counts for each category
            const categoriesWithCounts = await Promise.all((data || []).map(async (cat) => {
                let countQuery = supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('category_id', cat.id);

                if (instId) {
                    countQuery = countQuery.eq('institute_id', instId);
                }

                const { count } = await countQuery;

                return {
                    ...cat,
                    isStarred: cat.is_starred,
                    forForum: cat.for_forum,
                    count: count || 0
                };
            }));

            setCategories(categoriesWithCounts);
        } catch (error) {
            console.error('Error fetching categories:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (categoryData) => {
        try {
            const instId = await resolveInstituteId(categoryData.instituteId);

            const newCategory = {
                name: categoryData.name,
                color: categoryData.color || '#000000',
                is_starred: categoryData.isStarred || false,
                for_forum: categoryData.forForum || false,
                institute_id: instId
            };

            const { data, error } = await supabase
                .from('categories')
                .insert([newCategory])
                .select();

            if (error) throw error;

            if (data) {
                setCategories(prev => [...prev, {
                    ...data[0],
                    isStarred: data[0].is_starred,
                    forForum: data[0].for_forum,
                    count: 0
                }]);
            }
        } catch (error) {
            console.error('Error adding category:', error.message);
            alert('Error adding category: ' + error.message);
        }
    };

    const updateCategory = async (id, updatedData) => {
        try {
            // Map camelCase to snake_case for DB
            const dbUpdates = {};
            if (updatedData.name) dbUpdates.name = updatedData.name;
            if (updatedData.color) dbUpdates.color = updatedData.color;
            if (updatedData.isStarred !== undefined) dbUpdates.is_starred = updatedData.isStarred;
            if (updatedData.forForum !== undefined) dbUpdates.for_forum = updatedData.forForum;

            const { error } = await supabase
                .from('categories')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            setCategories(prev => prev.map(cat =>
                cat.id === id ? { ...cat, ...updatedData } : cat
            ));
        } catch (error) {
            console.error('Error updating category:', error.message);
        }
    };

    const deleteCategory = async (id) => {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCategories(prev => prev.filter(cat => cat.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error.message);
        }
    };

    const getCategory = (id) => {
        return categories.find(cat => String(cat.id) === String(id));
    };

    return (
        <CategoryContext.Provider value={{ categories, loading, fetchCategories, updateCategory, addCategory, deleteCategory, getCategory }}>
            {children}
        </CategoryContext.Provider>
    );
};
