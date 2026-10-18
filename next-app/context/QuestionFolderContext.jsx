'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const QuestionFolderContext = createContext();

export const useQuestionFolders = () => useContext(QuestionFolderContext);

export const QuestionFolderProvider = ({ children }) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const { institute } = useInstitute();

    // useEffect(() => {
    //     if (institute?.id) {
    //         fetchFolders(page, searchQuery, limit, institute.id);
    //     }
    // }, [institute?.id]);

    const fetchFolders = async (newPage = page, newSearch = searchQuery, newLimit = limit, instituteId = institute?.id) => {
        // If no institute ID, don't fetch (prevents leaking other tenant data)
        if (!instituteId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: newPage.toString(),
                limit: newLimit.toString(),
                search: newSearch
            });
            if (instituteId) queryParams.append('instituteId', instituteId);

            const response = await fetch(`/api/admin/question-folders?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch folders');

            const result = await response.json();

            setFolders(result.data);
            setTotalPages(result.totalPages);
            setTotalItems(result.count);
            setPage(newPage);
            setSearchQuery(newSearch);
            setLimit(newLimit);
        } catch (err) {
            console.error('Error fetching folders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchFolders(newPage, searchQuery, limit);
        }
    };

    const searchFolders = (query) => {
        fetchFolders(1, query, limit); // Reset to page 1 on search
    };

    const changeItemsPerPage = (newLimit) => {
        fetchFolders(1, searchQuery, newLimit); // Reset to page 1 when changing page size
    };

    const addFolder = async (folderData) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('question_folders')
                .insert([{ ...folderData, institute_id: institute?.id }])
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
            // 1. Fetch raw links
            const { data: folderLinks, error: fError } = await supabase
                .from('question_folder_items')
                .select('folder_id')
                .eq('question_id', questionId);

            if (fError) throw fError;

            // 2. Fetch details
            if (!folderLinks || folderLinks.length === 0) return { success: true, data: [] };

            const folderIds = folderLinks.map(i => i.folder_id);
            const { data: folders, error: foldersError } = await supabase
                .from('question_folders')
                .select('id, name')
                .in('id', folderIds);

            if (foldersError) throw foldersError;

            // 3. Map
            const folderMap = new Map(folders.map(f => [f.id, f.name]));
            const data = folderLinks.map(item => ({
                folder_id: item.folder_id,
                question_folders: { name: folderMap.get(item.folder_id) || 'Unknown' }
            }));

            return { success: true, data };
        } catch (err) {
            console.error('Error fetching question usage:', err);
            return { success: false, error: err.message };
        }
    };

    const getQuestionsUsage = async (questionIds) => {
        if (!questionIds || questionIds.length === 0) return { success: true, data: [] };

        try {
            // 1. Fetch raw links
            const [folderLinks, examLinks] = await Promise.all([
                supabase
                    .from('question_folder_items')
                    .select('question_id, folder_id')
                    .in('question_id', questionIds),
                supabase
                    .from('exam_questions')
                    .select('question_id, exam_id')
                    .in('question_id', questionIds)
            ]);

            if (folderLinks.error) throw folderLinks.error;
            if (examLinks.error) throw examLinks.error;

            // 2. Fetch details for unique IDs
            const folderIds = [...new Set(folderLinks.data.map(i => i.folder_id))];
            const examIds = [...new Set(examLinks.data.map(i => i.exam_id))];

            const [folders, exams] = await Promise.all([
                folderIds.length > 0
                    ? supabase.from('question_folders').select('id, name').in('id', folderIds)
                    : { data: [] },
                examIds.length > 0
                    ? supabase.from('exams').select('id, title').in('id', examIds)
                    : { data: [] }
            ]);

            // Create Maps
            const folderMap = new Map(folders.data?.map(f => [f.id, f.name]) || []);
            const examMap = new Map(exams.data?.map(e => [e.id, e.title]) || []);

            // 3. Combine
            const combinedData = [
                ...folderLinks.data.map(item => ({
                    type: 'folder',
                    question_id: item.question_id,
                    id: item.folder_id,
                    name: folderMap.get(item.folder_id) || 'Unknown Folder'
                })),
                ...examLinks.data.map(item => ({
                    type: 'exam',
                    question_id: item.question_id,
                    id: item.exam_id,
                    name: examMap.get(item.exam_id) || 'Unknown Exam'
                }))
            ];

            return { success: true, data: combinedData };
        } catch (err) {
            console.error('Error fetching questions usage:', err);
            return { success: false, error: err.message };
        }
    };

    const getFolderDetails = async (id) => {
        try {
            // Use the folder questions API which also returns folder details
            const response = await fetch(`/api/folders/${id}/questions?limit=1`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch folder details');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch folder details');
            }

            return { success: true, data: result.folder };
        } catch (err) {
            console.error('Error fetching folder details:', err);
            return { success: false, error: err.message };
        }
    };

    const getFolderQuestions = async (folderId, { page = 1, limit = 200, search = '' } = {}) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            if (search) params.append('search', search);

            const response = await fetch(`/api/folders/${folderId}/questions?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch folder questions');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch folder questions');
            }

            return { success: true, data: result.data, count: result.count };
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

    const reorderFolderQuestions = async (folderId, reorderedItems, offset = 0) => {
        try {
            // Update positions for all items based on page offset
            const updates = reorderedItems.map((item, index) =>
                supabase
                    .from('question_folder_items')
                    .update({ position: offset + index + 1 })
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
                getFolderDetails,
                updateQuestionPosition,
                reorderFolderQuestions,
                goToPage,
                searchFolders,
                changeItemsPerPage,
                page,
                totalPages,
                totalItems,
                limit,
                loading,
                error
            }}
        >
            {children}
        </QuestionFolderContext.Provider>
    );
};
