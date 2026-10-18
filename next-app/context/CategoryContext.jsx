import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';
import { addCategoryAction, updateCategoryAction, deleteCategoryAction } from '../app/actions/categories';

const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { institute } = useInstitute();

    const fetchCategories = useCallback(async (instituteId) => {
        try {
            if (!instituteId) return;

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('institute_id', instituteId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch post counts for each category
            const categoriesWithCounts = await Promise.all(data.map(async (cat) => {
                const { count } = await supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('category_id', cat.id)
                    .eq('is_deleted', false);

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
    }, []);

    const addCategory = useCallback(async (categoryData) => {
        try {
            const dataWithInstitute = {
                ...categoryData,
                institute_id: institute?.id
            };

            const result = await addCategoryAction(dataWithInstitute);

            if (!result.success) throw new Error(result.error);

            if (result.data) {
                setCategories(prev => [...prev, {
                    ...result.data,
                    isStarred: result.data.is_starred,
                    forForum: result.data.for_forum,
                    count: 0
                }]);
            }
        } catch (error) {
            console.error('Error adding category:', error.message);
            alert('Error adding category: ' + error.message);
        } finally {
            if (institute?.id) await fetchCategories(institute.id);
        }
    }, [institute?.id, fetchCategories]);

    const updateCategory = useCallback(async (id, updatedData) => {
        try {
            console.log('[CategoryContext] Calling updateCategoryAction. ID:', id, 'Payload:', updatedData);

            const result = await updateCategoryAction(id, updatedData);

            if (!result.success) {
                console.error('[CategoryContext] updateCategoryAction failed:', result.error);
                throw new Error(result.error);
            }

            console.log('[CategoryContext] Update success:', result.data);

            // Update local state immediately
            setCategories(prev => prev.map(cat =>
                cat.id === id ? {
                    ...cat,
                    ...updatedData,
                    isStarred: result.data.is_starred, // Ensure we use updated DB field
                    forForum: result.data.for_forum
                } : cat
            ));

        } catch (error) {
            console.error('[CategoryContext] Update Error:', error.message);
            alert('Failed to update category: ' + error.message);
        }
    }, [institute?.id]);

    const deleteCategory = useCallback(async (id) => {
        try {
            const result = await deleteCategoryAction(id);

            if (!result.success) throw new Error(result.error);

            setCategories(prev => prev.filter(cat => cat.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error.message);
            alert('Error deleting category: ' + error.message);
        } finally {
            if (institute?.id) await fetchCategories(institute.id);
        }
    }, [institute?.id, fetchCategories]);

    const getCategory = useCallback((id) => {
        return categories.find(cat => String(cat.id) === String(id));
    }, [categories]);

    const value = useMemo(() => ({
        categories,
        loading,
        updateCategory,
        addCategory,
        deleteCategory,
        getCategory,
        fetchCategories
    }), [categories, loading, updateCategory, addCategory, deleteCategory, getCategory, fetchCategories]);

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
};
