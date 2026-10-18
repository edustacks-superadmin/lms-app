'use server';

import { supabaseAdmin } from '../../lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Adds a new category using the admin client to bypass RLS.
 */
export async function addCategoryAction(categoryData) {
    try {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert([{
                name: categoryData.name,
                color: categoryData.color || '#3b82f6',
                is_starred: !!categoryData.isStarred,
                for_forum: !!categoryData.forForum,
                institute_id: categoryData.institute_id || 10
            }])
            .select();

        if (error) throw error;

        revalidatePath('/admin/posts/categories');
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('[addCategoryAction] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Updates an existing category using the admin client to bypass RLS.
 */
export async function updateCategoryAction(id, updatedData) {
    try {
        if (!id) throw new Error('Category ID is required for update');

        // Map camelCase to snake_case
        const dbUpdates = {};
        if (updatedData.name !== undefined) dbUpdates.name = updatedData.name;
        if (updatedData.color !== undefined) dbUpdates.color = updatedData.color;
        if (updatedData.isStarred !== undefined) dbUpdates.is_starred = !!updatedData.isStarred;
        if (updatedData.forForum !== undefined) dbUpdates.for_forum = !!updatedData.forForum;

        console.log(`[updateCategoryAction] Updating ID: ${id}`, dbUpdates);

        const { data, error } = await supabaseAdmin
            .from('categories')
            .update(dbUpdates)
            .eq('id', Number(id))
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('Category not found or no changes applied');
        }

        revalidatePath('/admin/posts/categories');
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('[updateCategoryAction] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a category using the admin client to bypass RLS.
 */
export async function deleteCategoryAction(id) {
    try {
        if (!id) throw new Error('Category ID is required for deletion');

        const { error } = await supabaseAdmin
            .from('categories')
            .delete()
            .eq('id', Number(id));

        if (error) throw error;

        revalidatePath('/admin/posts/categories');
        return { success: true };
    } catch (error) {
        console.error('[deleteCategoryAction] Error:', error.message);
        return { success: false, error: error.message };
    }
}
