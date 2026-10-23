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
                .order('id', { ascending: false })
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
            const numericId = parseInt(id, 10);
            const targetId = isNaN(numericId) ? id : numericId;

            // Sanitize data: convert empty strings to null for UUID/int fields
            const sanitizedData = { ...questionData };
            delete sanitizedData.subjects; // Remove join object if present
            delete sanitizedData.options;
            delete sanitizedData.tags;
            delete sanitizedData.percentage_correct;

            if (sanitizedData.subject_id === '' || sanitizedData.subject_id === undefined) {
                sanitizedData.subject_id = null;
            } else if (sanitizedData.subject_id !== null) {
                const subId = parseInt(sanitizedData.subject_id, 10);
                sanitizedData.subject_id = isNaN(subId) ? sanitizedData.subject_id : subId;
            }

            // Update question
            const { error: questionError } = await supabase
                .from('questions')
                .update({ ...sanitizedData, updated_at: new Date() })
                .eq('id', targetId);

            if (questionError) throw questionError;

            // Delete existing options and insert new ones
            await supabase.from('question_options').delete().eq('question_id', targetId);

            if (options && options.length > 0) {
                const optionsWithQuestionId = options.map((opt, index) => ({
                    option_label: opt.option_label,
                    option_text: opt.option_text,
                    is_correct: !!opt.is_correct,
                    option_order: index + 1,
                    question_id: targetId,
                    institute_id: 10
                }));

                const { error: optionsError } = await supabase
                    .from('question_options')
                    .insert(optionsWithQuestionId);

                if (optionsError) throw optionsError;
            }

            // Update tags
            await supabase.from('question_tags').delete().eq('question_id', targetId);

            if (tags.length > 0) {
                const tagsWithQuestionId = tags.map(tag => ({
                    question_id: targetId,
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

    const getQuestionById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const numericId = parseInt(id, 10);
            const targetId = isNaN(numericId) ? id : numericId;

            const { data: question, error: questionError } = await supabase
                .from('questions')
                .select('*, subjects(name, parent_id)')
                .eq('id', targetId)
                .single();

            if (questionError) throw questionError;
            if (!question) throw new Error('Question not found');

            const { data: options, error: optionsError } = await supabase
                .from('question_options')
                .select('*')
                .eq('question_id', targetId)
                .order('option_order', { ascending: true });

            if (optionsError) console.error('Error fetching options:', optionsError);

            const { data: tags, error: tagsError } = await supabase
                .from('question_tags')
                .select('*')
                .eq('question_id', targetId);

            if (tagsError) console.error('Error fetching tags:', tagsError);

            return {
                success: true,
                data: {
                    ...question,
                    options: options || [],
                    tags: tags || []
                }
            };
        } catch (err) {
            console.error('Error fetching question by id:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateQuestionSubject = async (questionId, subjectId) => {
        try {
            const { error: updateError } = await supabase
                .from('questions')
                .update({ subject_id: subjectId, updated_at: new Date() })
                .eq('id', questionId);

            if (updateError) throw updateError;

            setQuestions(prev => prev.map(q => {
                if (q.id === questionId) {
                    return { ...q, subject_id: subjectId };
                }
                return q;
            }));
            return { success: true };
        } catch (err) {
            console.error('Error updating question subject:', err);
            return { success: false, error: err.message };
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
                setQuestions,
                totalCount,
                fetchQuestions,
                getQuestionById,
                addQuestion,
                updateQuestion,
                updateQuestionSubject,
                deleteQuestion,
                loading,
                error
            }}
        >
            {children}
        </QuestionContext.Provider>
    );
};
