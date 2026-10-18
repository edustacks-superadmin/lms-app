import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch post counts for each category
            const categoriesWithCounts = await Promise.all(data.map(async (cat) => {
                const { count } = await supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('category_id', cat.id);

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
            const newCategory = {
                name: categoryData.name,
                color: categoryData.color || '#000000',
                is_starred: categoryData.isStarred || false,
                for_forum: categoryData.forForum || false
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
        <CategoryContext.Provider value={{ categories, loading, updateCategory, addCategory, deleteCategory, getCategory }}>
            {children}
        </CategoryContext.Provider>
    );
};
