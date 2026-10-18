import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';

const QuestionFolderContext = createContext();

export const useQuestionFolders = () => useContext(QuestionFolderContext);

export const QuestionFolderProvider = ({ children }) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchFolders = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: foldersData, error: foldersError } = await supabase
                .from('question_folders')
                .select('*')
                .order('created_at', { ascending: false });

            if (foldersError) throw foldersError;

            // Get question counts for each folder
            const foldersWithCounts = await Promise.all(
                foldersData.map(async (folder) => {
                    const { count, error: countError } = await supabase
                        .from('question_folder_items')
                        .select('*', { count: 'exact', head: true })
                        .eq('folder_id', folder.id);

                    if (countError) {
                        console.error('Error fetching count:', countError);
                        return { ...folder, questionCount: 0 };
                    }

                    return { ...folder, questionCount: count || 0 };
                })
            );

            setFolders(foldersWithCounts);
        } catch (err) {
            console.error('Error fetching folders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addFolder = async (folderData) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('question_folders')
                .insert([folderData])
                .select();

            if (error) throw error;

            setFolders(prev => [...prev, { ...data[0], questionCount: 0 }]);
            return { success: true, data };
        } catch (err) {
            console.error('Error adding folder:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateFolder = async (id, folderData) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('question_folders')
                .update(folderData)
                .eq('id', id)
                .select();

            if (error) throw error;

            setFolders(prev =>
                prev.map(folder => folder.id === id ? { ...folder, ...data[0] } : folder)
            );
            return { success: true, data };
        } catch (err) {
            console.error('Error updating folder:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteFolder = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('question_folders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setFolders(prev => prev.filter(folder => folder.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting folder:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const addQuestionToFolder = async (questionId, folderId) => {
        try {
            // Get the next position number for this folder
            const { data: existingItems, error: countError } = await supabase
                .from('question_folder_items')
                .select('position')
                .eq('folder_id', folderId)
                .order('position', { ascending: false })
                .limit(1);

            if (countError) throw countError;

            const nextPosition = existingItems && existingItems.length > 0
                ? existingItems[0].position + 1
                : 1;

            const { error } = await supabase
                .from('question_folder_items')
                .insert([{
                    question_id: questionId,
                    folder_id: folderId,
                    position: nextPosition
                }]);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error adding question to folder:', err);
            return { success: false, error: err.message };
        }
    };

    const removeQuestionFromFolder = async (questionId, folderId) => {
        try {
            // Get the position of the question being removed
            const { data: removedItem } = await supabase
                .from('question_folder_items')
                .select('position')
                .eq('question_id', questionId)
                .eq('folder_id', folderId)
                .single();

            const { error } = await supabase
                .from('question_folder_items')
                .delete()
                .eq('question_id', questionId)
                .eq('folder_id', folderId);

            if (error) throw error;

            // Reorder remaining questions to fill the gap
            if (removedItem) {
                const { error: updateError } = await supabase.rpc('reorder_folder_questions', {
                    p_folder_id: folderId,
                    p_removed_position: removedItem.position
                });

                if (updateError) console.error('Error reordering:', updateError);
            }

            return { success: true };
        } catch (err) {
            console.error('Error removing question from folder:', err);
            return { success: false, error: err.message };
        }
    };

    const bulkRemoveQuestionsFromFolder = async (questionIds, folderId) => {
        try {
            const { error } = await supabase
                .from('question_folder_items')
                .delete()
                .in('question_id', questionIds)
                .eq('folder_id', folderId);

            if (error) throw error;

            // Reorder remaining questions
            // Note: For bulk operations, a full reorder might be expensive but necessary for consistency.
            // A simpler approach for now is to just re-fetch and let the UI handle it or trigger a reorder.
            // Ideally, we should have a stored procedure for this, but for now we'll just delete.

            return { success: true };
        } catch (err) {
            console.error('Error bulk removing questions from folder:', err);
            return { success: false, error: err.message };
        }
    };

    const getQuestionUsage = async (questionId) => {
        try {
            const { data, error } = await supabase
                .from('question_folder_items')
                .select('folder_id, question_folders(name)')
                .eq('question_id', questionId);

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('Error fetching question usage:', err);
            return { success: false, error: err.message };
        }
    };

    const getQuestionsUsage = async (questionIds) => {
        if (!questionIds || questionIds.length === 0) return { success: true, data: [] };

        try {
            const [folderResult, examResult] = await Promise.all([
                supabase
                    .from('question_folder_items')
                    .select('question_id, folder_id, question_folders(name)')
                    .in('question_id', questionIds),
                supabase
                    .from('exam_questions')
                    .select('question_id, exam_id, exams(title)')
                    .in('question_id', questionIds)
            ]);

            if (folderResult.error) throw folderResult.error;
            if (examResult.error) throw examResult.error;

            // Combine results
            const combinedData = [
                ...folderResult.data.map(item => ({
                    type: 'folder',
                    question_id: item.question_id,
                    id: item.folder_id,
                    name: item.question_folders?.name
                })),
                ...examResult.data.map(item => ({
                    type: 'exam',
                    question_id: item.question_id,
                    id: item.exam_id,
                    name: item.exams?.title
                }))
            ];

            return { success: true, data: combinedData };
        } catch (err) {
            console.error('Error fetching questions usage:', err);
            return { success: false, error: err.message };
        }
    };

    const getFolderQuestions = async (folderId) => {
        try {
            const { data, error } = await supabase
                .from('question_folder_items')
                .select('question_id, position, questions(*, options:question_options(*), tags:question_tags(*))')
                .eq('folder_id', folderId)
                .order('position', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('Error fetching folder questions:', err);
            return { success: false, error: err.message };
        }
    };

    const updateQuestionPosition = async (folderId, questionId, newPosition) => {
        try {
            const { error } = await supabase
                .from('question_folder_items')
                .update({ position: newPosition })
                .eq('folder_id', folderId)
                .eq('question_id', questionId);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error updating question position:', err);
            return { success: false, error: err.message };
        }
    };

    const reorderFolderQuestions = async (folderId, reorderedItems) => {
        try {
            // Update positions for all items
            const updates = reorderedItems.map((item, index) =>
                supabase
                    .from('question_folder_items')
                    .update({ position: index + 1 })
                    .eq('folder_id', folderId)
                    .eq('question_id', item.question_id)
            );

            await Promise.all(updates);
            return { success: true };
        } catch (err) {
            console.error('Error reordering questions:', err);
            return { success: false, error: err.message };
        }
    };

    return (
        <QuestionFolderContext.Provider
            value={{
                folders,
                fetchFolders,
                addFolder,
                updateFolder,
                deleteFolder,
                addQuestionToFolder,
                removeQuestionFromFolder,
                bulkRemoveQuestionsFromFolder,
                getQuestionUsage,
                getQuestionsUsage,
                getFolderQuestions,
                updateQuestionPosition,
                reorderFolderQuestions,
                loading,
                error
            }}
        >
            {children}
        </QuestionFolderContext.Provider>
    );
};
