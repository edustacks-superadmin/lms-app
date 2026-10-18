import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ExamContext = createContext();

export const useExams = () => {
    const context = useContext(ExamContext);
    if (!context) {
        throw new Error('useExams must be used within an ExamProvider');
    }
    return context;
};

export const ExamProvider = ({ children }) => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select(`
                    *,
                    course_exams (
                        courses (
                            id,
                            title
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setExams(data);
        } catch (error) {
            console.error('Error fetching exams:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getExamById = async (id) => {
        try {
            // First fetch the exam record
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .single();

            if (examError) throw examError;
            if (!examData) return null;

            // Then fetch the associated questions
            const questions = await fetchExamQuestions(id);

            return {
                ...examData,
                exam_questions: questions || []
            };
        } catch (error) {
            console.error('Error fetching exam:', error.message);
            return null;
        }
    };

    const addExam = async (examData) => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .insert([examData])
                .select()
                .single();

            if (error) throw error;

            setExams(prev => [data, ...prev]);
            return data;
        } catch (error) {
            console.error('Error adding exam:', error.message);
            throw error;
        }
    };

    const updateExam = async (id, examData) => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .update(examData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setExams(prev => prev.map(exam => exam.id === id ? data : exam));
            return data;
        } catch (error) {
            console.error('Error updating exam:', error.message);
            throw error;
        }
    };

    const deleteExam = async (id) => {
        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setExams(prev => prev.filter(exam => exam.id !== id));
        } catch (error) {
            console.error('Error deleting exam:', error.message);
            throw error;
        }
    };

    const syncExamStats = async (examId) => {
        try {
            // Get all questions for this exam
            const { data: questions, error: qError } = await supabase
                .from('exam_questions')
                .select('marks')
                .eq('exam_id', examId);

            if (qError) throw qError;

            const numberOfQuestions = questions.length;
            const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

            // Update exam
            const { error: updateError } = await supabase
                .from('exams')
                .update({
                    number_of_questions: numberOfQuestions,
                    total_marks: totalMarks
                })
                .eq('id', examId);

            if (updateError) throw updateError;

            // Update local state
            setExams(prev => prev.map(exam =>
                exam.id === examId
                    ? { ...exam, number_of_questions: numberOfQuestions, total_marks: totalMarks }
                    : exam
            ));

        } catch (error) {
            console.error('Error syncing exam stats:', error.message);
        }
    };

    const addQuestionToExam = async (examId, questionId, marks = 1, order = 0, sectionId = null) => {
        try {
            const payload = { exam_id: examId, question_id: questionId, marks, order };
            if (sectionId) payload.section_id = sectionId;

            const { data, error } = await supabase
                .from('exam_questions')
                .insert([payload])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding question to exam:', error.message);
            throw error;
        }
    };

    const removeQuestionFromExam = async (examId, questionId) => {
        try {
            const { error } = await supabase
                .from('exam_questions')
                .delete()
                .match({ exam_id: examId, question_id: questionId });

            if (error) throw error;

            // Sync stats
            await syncExamStats(examId);
        } catch (error) {
            console.error('Error removing question from exam:', error.message);
            throw error;
        }
    };

    const bulkRemoveQuestionsFromExam = async (examId, questionIds) => {
        try {
            const { error } = await supabase
                .from('exam_questions')
                .delete()
                .eq('exam_id', examId)
                .in('question_id', questionIds);

            if (error) throw error;

            // Sync stats
            await syncExamStats(examId);
        } catch (error) {
            console.error('Error bulk removing questions from exam:', error.message);
            throw error;
        }
    };

    const fetchExamQuestions = async (examId) => {
        try {
            // First attempt nested join
            const { data, error } = await supabase
                .from('exam_questions')
                .select(`
                    *,
                    questions (
                        *,
                        options:question_options(*),
                        tags:question_tags(*)
                    )
                `)
                .eq('exam_id', examId)
                .order('order', { ascending: true });

            if (!error && data) return data;

            // Fallback: fetch separately if schema relationship cache is missing
            const { data: eqList, error: eqError } = await supabase
                .from('exam_questions')
                .select('*')
                .eq('exam_id', examId)
                .order('order', { ascending: true });

            if (eqError || !eqList || eqList.length === 0) return [];

            const questionIds = eqList.map(eq => eq.question_id).filter(Boolean);
            if (questionIds.length === 0) return eqList;

            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select(`
                    *,
                    options:question_options(*),
                    tags:question_tags(*)
                `)
                .in('id', questionIds);

            if (qError) throw qError;

            const questionsMap = new Map((questionsData || []).map(q => [q.id, q]));
            return eqList.map(eq => ({
                ...eq,
                questions: questionsMap.get(eq.question_id) || null
            }));
        } catch (error) {
            console.error('Error fetching exam questions:', error.message);
            return [];
        }
    };

    // Attempt tracking functions
    const getStudentAttempts = async (examId, userId) => {
        try {
            const { data, error } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('exam_id', examId)
                .eq('user_id', userId)
                .order('attempt_number', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching student attempts:', error.message);
            return [];
        }
    };

    const createAttempt = async (examId, userId) => {
        try {
            // Get existing attempts count
            const attempts = await getStudentAttempts(examId, userId);
            const attemptNumber = attempts.length + 1;

            const { data, error } = await supabase
                .from('exam_attempts')
                .insert([{
                    exam_id: examId,
                    user_id: userId,
                    attempt_number: attemptNumber,
                    started_at: new Date().toISOString(),
                    status: 'in_progress'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating attempt:', error.message);
            throw error;
        }
    };

    const submitAttempt = async (attemptId, answers, score, totalMarks, tabSwitches = 0, isAutoSubmitted = false) => {
        try {
            const { data, error } = await supabase
                .from('exam_attempts')
                .update({
                    submitted_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    score: score,
                    total_marks: totalMarks,
                    questions_answered: answers,
                    tab_switches: tabSwitches,
                    is_auto_submitted: isAutoSubmitted,
                    status: 'completed'
                })
                .eq('id', attemptId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error submitting attempt:', error.message);
            throw error;
        }
    };

    const canTakeExam = async (examId, userId) => {
        try {
            // Get exam details
            const exam = await getExamById(examId);
            if (!exam) return { canTake: false, reason: 'Exam not found' };

            // Check attempts
            const attempts = await getStudentAttempts(examId, userId);

            // Check max attempts
            if (exam.max_attempts > 0 && attempts.length >= exam.max_attempts) {
                return { canTake: false, reason: `Maximum attempts (${exam.max_attempts}) reached` };
            }

            // Check gap between attempts
            if (attempts.length > 0 && exam.attempt_gap_minutes > 0) {
                const lastAttempt = attempts[attempts.length - 1];
                if (lastAttempt.submitted_at) {
                    const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.submitted_at).getTime();
                    const requiredGap = exam.attempt_gap_minutes * 60 * 1000;

                    if (timeSinceLastAttempt < requiredGap) {
                        const remainingMinutes = Math.ceil((requiredGap - timeSinceLastAttempt) / 60000);
                        return { canTake: false, reason: `Please wait ${remainingMinutes} minutes before attempting again` };
                    }
                }
            }

            return { canTake: true };
        } catch (error) {
            console.error('Error checking if can take exam:', error.message);
            return { canTake: false, reason: 'Error checking eligibility' };
        }
    };

    // Section Management Functions
    const getExamSections = async (examId) => {
        try {
            const { data, error } = await supabase
                .from('exam_sections')
                .select('*')
                .eq('exam_id', examId)
                .order('section_order', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching exam sections:', error.message);
            return [];
        }
    };

    const addExamSection = async (examId, sectionData) => {
        try {
            const { data, error } = await supabase
                .from('exam_sections')
                .insert([{
                    exam_id: examId,
                    section_name: sectionData.section_name,
                    section_order: sectionData.section_order,
                    instructions: sectionData.instructions || null,
                    total_marks: sectionData.total_marks || null,
                    passing_marks: sectionData.passing_marks || null,
                    is_mandatory: sectionData.is_mandatory !== false
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding exam section:', error.message);
            throw error;
        }
    };

    const updateExamSection = async (sectionId, sectionData) => {
        try {
            const { data, error } = await supabase
                .from('exam_sections')
                .update({
                    section_name: sectionData.section_name,
                    section_order: sectionData.section_order,
                    instructions: sectionData.instructions,
                    total_marks: sectionData.total_marks,
                    passing_marks: sectionData.passing_marks,
                    is_mandatory: sectionData.is_mandatory
                })
                .eq('id', sectionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating exam section:', error.message);
            throw error;
        }
    };

    const deleteExamSection = async (sectionId) => {
        try {
            const { error } = await supabase
                .from('exam_sections')
                .delete()
                .eq('id', sectionId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting exam section:', error.message);
            throw error;
        }
    };

    const updateQuestionSection = async (examQuestionId, sectionId, isMandatory = true, sectionOrder = null) => {
        try {
            const { data, error } = await supabase
                .from('exam_questions')
                .update({
                    section_id: sectionId,
                    is_mandatory: isMandatory,
                    section_order: sectionOrder
                })
                .eq('id', examQuestionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating question section:', error.message);
            throw error;
        }
    };

    const fetchExamQuestionsWithSections = async (examId) => {
        try {
            // First attempt nested join
            const { data, error } = await supabase
                .from('exam_questions')
                .select(`
                    *,
                    questions (
                        id,
                        question_text,
                        options:question_options (
                            id,
                            option_label,
                            option_text,
                            is_correct
                        )
                    ),
                    exam_sections (
                        id,
                        section_name,
                        section_order,
                        instructions,
                        total_marks,
                        passing_marks,
                        is_mandatory
                    )
                `)
                .eq('exam_id', examId)
                .order('order', { ascending: true });

            if (!error && data) return data || [];

            // Fallback: manual join if relationship cache is missing
            const { data: eqList, error: eqError } = await supabase
                .from('exam_questions')
                .select('*')
                .eq('exam_id', examId)
                .order('order', { ascending: true });

            if (eqError || !eqList || eqList.length === 0) return [];

            const questionIds = eqList.map(eq => eq.question_id).filter(Boolean);
            const { data: questionsData } = await supabase
                .from('questions')
                .select(`
                    id,
                    question_text,
                    options:question_options (
                        id,
                        option_label,
                        option_text,
                        is_correct
                    )
                `)
                .in('id', questionIds);

            const questionsMap = new Map((questionsData || []).map(q => [q.id, q]));

            // Fetch sections if any
            const { data: sectionsData } = await supabase
                .from('exam_sections')
                .select('*')
                .eq('exam_id', examId);

            const sectionsMap = new Map((sectionsData || []).map(s => [s.id, s]));

            return eqList.map(eq => ({
                ...eq,
                questions: questionsMap.get(eq.question_id) || null,
                exam_sections: eq.section_id ? sectionsMap.get(eq.section_id) || null : null
            }));
        } catch (error) {
            console.error('Error fetching exam questions with sections:', error.message);
            return [];
        }
    };

    return (
        <ExamContext.Provider value={{
            exams,
            loading,
            fetchExams,
            getExamById,
            addExam,
            updateExam,
            deleteExam,
            addQuestionToExam,
            removeQuestionFromExam,
            bulkRemoveQuestionsFromExam,
            fetchExamQuestions,
            getStudentAttempts,
            createAttempt,
            submitAttempt,
            canTakeExam,
            // Section management
            getExamSections,
            addExamSection,
            updateExamSection,
            deleteExamSection,
            updateQuestionSection,
            fetchExamQuestionsWithSections
        }}>
            {children}
        </ExamContext.Provider>
    );
};
