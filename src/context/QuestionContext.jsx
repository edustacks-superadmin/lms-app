import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';

const QuestionContext = createContext();

export const useQuestions = () => useContext(QuestionContext);

export const QuestionProvider = ({ children }) => {
    const [questions, setQuestions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                search = ''
            } = filters;

            let query = supabase
                .from('questions')
                .select('*, subjects(name, parent_id)', { count: 'exact' });

            // Apply filters
            if (subjectId) query = query.eq('subject_id', subjectId);
            if (questionType) query = query.eq('question_type', questionType);
            if (difficultyLevel) query = query.eq('difficulty_level', difficultyLevel);
            if (search) query = query.ilike('question_text', `%${search}%`);

            // Apply pagination
            const from = (page - 1) * perPage;
            const to = from + perPage - 1;

            const { data, error: fetchError, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (fetchError) throw fetchError;

            // Fetch options for each question
            const questionsWithOptions = await Promise.all(
                data.map(async (question) => {
                    const { data: options, error: optionsError } = await supabase
                        .from('question_options')
                        .select('*')
                        .eq('question_id', question.id)
                        .order('option_label', { ascending: true });

                    if (optionsError) {
                        console.error('Error fetching options:', optionsError);
                        return { ...question, options: [] };
                    }

                    // Fetch tags
                    const { data: tags, error: tagsError } = await supabase
                        .from('question_tags')
                        .select('*')
                        .eq('question_id', question.id);

                    if (tagsError) {
                        console.error('Error fetching tags:', tagsError);
                        return { ...question, options, tags: [] };
                    }

                    return { ...question, options, tags };
                })
            );

            // Fetch stats using RPC
            const questionIds = questionsWithOptions.map(q => q.id);
            let statsMap = {};

            if (questionIds.length > 0) {
                const { data: stats, error: statsError } = await supabase
                    .rpc('get_questions_stats', { question_ids: questionIds });

                if (statsError) {
                    console.error('Error fetching stats (RPC might be missing):', statsError);
                } else if (stats) {
                    stats.forEach(stat => {
                        statsMap[stat.question_id] = stat.percentage_correct;
                    });
                }
            }

            const questionsWithStats = questionsWithOptions.map(q => ({
                ...q,
                percentage_correct: statsMap[q.id] !== undefined ? statsMap[q.id] : null
            }));

            setQuestions(questionsWithStats);
            setTotalCount(count || 0);
            return { success: true, data: questionsWithOptions, count };
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError(err.message);
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
                .insert([sanitizedData])
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

            // Update question
            const { error: questionError } = await supabase
                .from('questions')
                .update({ ...sanitizedData, updated_at: new Date() })
                .eq('id', id);

            if (questionError) throw questionError;

            // Delete existing options and insert new ones
            await supabase.from('question_options').delete().eq('question_id', id);

            const optionsWithQuestionId = options.map(opt => ({
                ...opt,
                question_id: id
            }));

            const { error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsWithQuestionId);

            if (optionsError) throw optionsError;

            // Update tags
            await supabase.from('question_tags').delete().eq('question_id', id);

            if (tags.length > 0) {
                const tagsWithQuestionId = tags.map(tag => ({
                    question_id: id,
                    tag_name: tag
                }));

                const { error: tagsError } = await supabase
                    .from('question_tags')
                    .insert(tagsWithQuestionId);

                if (tagsError) console.error('Error updating tags:', tagsError);
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
