import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';

const ProductCategoryContext = createContext();

export const useProductCategories = () => useContext(ProductCategoryContext);

export const ProductCategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch categories with product counts
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('product_categories')
                .select('*')
                .order('created_at', { ascending: false });

            if (categoriesError) throw categoriesError;

            // Get product counts for each category
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
            const dbData = {
                name: categoryData.name ? categoryData.name.trim() : ''
            };
            if (categoryData.institute_id) {
                dbData.institute_id = categoryData.institute_id;
            }

            const { data, error } = await supabase
                .from('product_categories')
                .insert([dbData])
                .select();

            if (error) throw error;

            // Add to local state with count 0
            setCategories(prev => [{ ...data[0], productCount: 0 }, ...prev]);
            return { success: true, data };
        } catch (err) {
            console.error('Error adding category:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateCategory = async (id, categoryData) => {
        setLoading(true);
        setError(null);
        try {
            const dbData = {
                name: categoryData.name ? categoryData.name.trim() : ''
            };

            const { data, error } = await supabase
                .from('product_categories')
                .update(dbData)
                .eq('id', id)
                .select();

            if (error) throw error;

            // Update local state
            setCategories(prev =>
                prev.map(cat => String(cat.id) === String(id) ? { ...cat, ...data[0] } : cat)
            );
            return { success: true, data };
        } catch (err) {
            console.error('Error updating category:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteCategory = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('product_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            setCategories(prev => prev.filter(cat => String(cat.id) !== String(id)));
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
