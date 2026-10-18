
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const ProductCategoryContext = createContext();
export const useProductCategories = () => useContext(ProductCategoryContext);

export const ProductCategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();

    useEffect(() => {
        if (institute?.id) {
            fetchCategories();
        }
    }, [institute?.id]);

    const fetchCategories = async () => {
        if (!institute?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Fetch categories via API with institute filter
            const response = await fetch(`/api/admin/store/categories?instituteId=${institute.id}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch categories');
            }
            const categoriesData = await response.json();

            // Get product counts for each category (client-side capable due to products policies)
            const categoriesWithCounts = await Promise.all(
                categoriesData.map(async (category) => {
                    const { count, error: countError } = await supabase
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', category.id);

                    if (countError) {
                        console.error('Error fetching count:', countError);
                        return { ...category, productCount: 0 };
                    }

                    return { ...category, productCount: count || 0 };
                })
            );

            setCategories(categoriesWithCounts);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (categoryData) => {
        setLoading(true);
        setError(null);
        try {
            const payload = { ...categoryData, institute_id: institute?.id };

            const response = await fetch('/api/admin/store/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to add category');
            }

            const newCategory = await response.json();

            // Add to local state with count 0
            setCategories(prev => [{ ...newCategory, productCount: 0 }, ...prev]);
            return { success: true, data: [newCategory] };
        } catch (err) {
            console.error('Error adding category:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateCategory = async (id, categoryData) => {
        if (!institute?.id) return { success: false, error: 'Institute ID missing' };

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/store/categories/${id}?instituteId=${institute.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to update category');
            }

            const updatedCategory = await response.json();

            // Update local state
            setCategories(prev =>
                prev.map(cat => cat.id === id ? { ...cat, ...updatedCategory } : cat)
            );
            return { success: true, data: [updatedCategory] };
        } catch (err) {
            console.error('Error updating category:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteCategory = async (id) => {
        if (!institute?.id) return { success: false, error: 'Institute ID missing' };

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/store/categories/${id}?instituteId=${institute.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to delete category');
            }

            // Remove from local state
            setCategories(prev => prev.filter(cat => cat.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting category:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProductCategoryContext.Provider
            value={{
                categories,
                fetchCategories,
                addCategory,
                updateCategory,
                deleteCategory,
                loading,
                error
            }}
        >
            {children}
        </ProductCategoryContext.Provider>
    );
};
