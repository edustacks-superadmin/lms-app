'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const QuestionContext = createContext();

export const useQuestions = () => useContext(QuestionContext);

export const QuestionProvider = ({ children }) => {
    const [questions, setQuestions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();

    // Redundant auto-fetch removed. QuestionList handles the initial fetch with correct params.
    /*
    useEffect(() => {
        if (institute?.id) {
            fetchQuestions({ instituteId: institute.id });
        }
    }, [institute?.id]);
    */

    const fetchQuestions = async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const {
                page = 1,
                perPage = 200,
                subjectId = null,
                questionType = null,
                difficultyLevel = null,
                folderId = null,
                tags = null,
                search = '',
                instituteId = institute?.id
            } = filters;

            if (!instituteId) {
                setLoading(false);
                return { success: true, data: [], count: 0 };
            }

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('perPage', perPage);
            if (subjectId) params.append('subjectId', subjectId);
            if (questionType) params.append('type', questionType);
            if (difficultyLevel) params.append('difficulty', difficultyLevel);
            if (folderId) params.append('folderId', folderId);
            if (tags) params.append('tags', tags);
            if (search) params.append('search', search);
            if (instituteId) params.append('instituteId', instituteId);

            const response = await fetch(`/api/questions?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch questions');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch questions');
            }

            const questionsData = result.data || [];
            const count = result.count || 0;

            setQuestions(questionsData);
            setTotalCount(count);
            return { success: true, data: questionsData, count };
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError(err.message);
            // Fallback to empty state on error, or preserve previous?
            // setQuestions([]); 
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = async (questionData, options, tags = []) => {
        setLoading(true);
        setError(null);
        try {
            // Sanitize data: convert empty strings to null for UUID fields
            const sanitizedData = { ...questionData };
            if (sanitizedData.subject_id === '') sanitizedData.subject_id = null;

            // Insert question
            const { data: questionResult, error: questionError } = await supabase
                .from('questions')
                .insert([{ ...sanitizedData, institute_id: institute?.id }])
                .select();

            if (questionError) throw questionError;

            const questionId = questionResult[0].id;

            // Insert options
            const optionsWithQuestionId = options.map(opt => ({
                ...opt,
                question_id: questionId
            }));

            const { error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsWithQuestionId);

            if (optionsError) throw optionsError;

            // Insert tags if provided
            if (tags.length > 0) {
                const tagsWithQuestionId = tags.map(tag => ({
                    question_id: questionId,
                    tag_name: tag
                }));

                const { error: tagsError } = await supabase
                    .from('question_tags')
                    .insert(tagsWithQuestionId);

                if (tagsError) console.error('Error inserting tags:', tagsError);
            }

            return { success: true, data: questionResult[0] };
        } catch (err) {
            console.error('Error adding question:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateQuestion = async (id, questionData, options, tags = []) => {
        setLoading(true);
        setError(null);
        try {
            // Sanitize data: convert empty strings to null for UUID fields
            const sanitizedData = { ...questionData };
            if (sanitizedData.subject_id === '') sanitizedData.subject_id = null;

            const response = await fetch(`/api/questions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionData: sanitizedData,
                    options,
                    tags
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update question');
            }

            return { success: true };
        } catch (err) {
            console.error('Error updating question:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestionById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/questions/${id}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch question');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch question');
            }

            return { success: true, data: result.data };
        } catch (err) {
            console.error('Error fetching question by id:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteQuestion = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setQuestions(prev => prev.filter(q => q.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting question:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <QuestionContext.Provider
            value={{
                questions,
                totalCount,
                fetchQuestions,
                fetchQuestionById,
                addQuestion,
                updateQuestion,
                deleteQuestion,
                loading,
                error
            }}
        >
            {children}
        </QuestionContext.Provider>
    );
};
