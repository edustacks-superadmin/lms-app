import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const ChapterContext = createContext();

export const useChapters = () => useContext(ChapterContext);

const normalizeChapter = (ch) => {
    if (!ch) return ch;
    return {
        ...ch,
        title: ch.name || ch.title || '',
        name: ch.name || ch.title || '',
        image: ch.icon || ch.image || null,
        icon: ch.icon || ch.image || null,
    };
};

export const ChapterProvider = ({ children }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchChapters = useCallback(async (courseId) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch chapters and their contents
            const { data, error } = await supabase
                .from('chapters')
                .select(`
                    *,
                    chapter_contents (
                        *,
                        exams (
                            id,
                            title,
                            description,
                            duration_minutes,
                            total_marks,
                            number_of_questions,
                            marks_per_question,
                            negative_marking_enabled,
                            negative_marks_per_question,
                            passing_marks,
                            max_attempts
                        )
                    )
                `)
                .eq('course_id', courseId)
                .order('order', { ascending: true });

            if (error) throw error;

            // Calculate total_marks for exams if not set
            const chaptersWithCalculatedMarks = await Promise.all(data.map(async (chapter) => {
                const contentsWithMarks = await Promise.all((chapter.chapter_contents || []).map(async (content) => {
                    if (content.type === 'exam' && content.exams && (!content.exams.total_marks || content.exams.total_marks === 0)) {
                        // Fetch question count and calculate total marks
                        const { data: questions, error: qError } = await supabase
                            .from('exam_questions')
                            .select('question_id')
                            .eq('exam_id', content.exams.id);

                        if (!qError && questions) {
                            // Fetch marks for each question
                            const questionIds = questions.map(q => q.question_id);
                            if (questionIds.length > 0) {
                                const { data: questionData } = await supabase
                                    .from('questions')
                                    .select('marks')
                                    .in('id', questionIds);

                                const totalMarks = questionData?.reduce((sum, q) => sum + (q.marks || 1), 0) || questionIds.length;

                                return {
                                    ...content,
                                    exams: {
                                        ...content.exams,
                                        total_marks: totalMarks
                                    }
                                };
                            }
                        }
                    }
                    return content;
                }));

                return normalizeChapter({
                    ...chapter,
                    chapter_contents: contentsWithMarks.sort((a, b) => a.order - b.order)
                });
            }));

            setChapters(chaptersWithCalculatedMarks || []);
        } catch (err) {
            console.error('Error fetching chapters:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addChapter = async (chapterData) => {
        try {
            const courseId = chapterData.courseId || chapterData.course_id;

            // Get max order
            const { data: maxOrderData } = await supabase
                .from('chapters')
                .select('order')
                .eq('course_id', courseId)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            const newChapter = {
                course_id: courseId,
                name: chapterData.name || chapterData.title || '',
                icon: chapterData.icon || chapterData.image || null,
                order: nextOrder,
                parent_id: chapterData.parent_id || null
            };

            const { data, error } = await supabase
                .from('chapters')
                .insert([newChapter])
                .select();

            if (error) throw error;

            // Initialize with empty contents
            const chapterWithContents = normalizeChapter({ ...data[0], chapter_contents: [] });

            setChapters(prev => [...prev, chapterWithContents]);
            return { success: true, data: chapterWithContents };
        } catch (err) {
            console.error('Error adding chapter:', err);
            return { success: false, error: err.message };
        }
    };

    const updateChapter = async (id, updates) => {
        try {
            const dbUpdates = { ...updates };
            if (dbUpdates.title !== undefined) {
                dbUpdates.name = dbUpdates.title;
                delete dbUpdates.title;
            }
            if (dbUpdates.image !== undefined) {
                dbUpdates.icon = dbUpdates.image;
                delete dbUpdates.image;
            }
            delete dbUpdates.description;

            const { data, error } = await supabase
                .from('chapters')
                .update(dbUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;

            const updatedChapter = normalizeChapter(data[0]);
            setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...updatedChapter } : ch));
            return { success: true, data: updatedChapter };
        } catch (err) {
            console.error('Error updating chapter:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteChapter = async (id) => {
        try {
            const { error } = await supabase
                .from('chapters')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setChapters(prev => prev.filter(ch => ch.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting chapter:', err);
            return { success: false, error: err.message };
        }
    };

    const reorderChapters = async (reorderedChapters) => {
        // Optimistic update
        setChapters(reorderedChapters);

        try {
            const updates = reorderedChapters.map((chapter, index) => ({
                id: chapter.id,
                order: index
            }));

            for (const update of updates) {
                const { error } = await supabase
                    .from('chapters')
                    .update({ order: update.order })
                    .eq('id', update.id);

                if (error) throw error;
            }
            return { success: true };
        } catch (err) {
            console.error('Error reordering chapters:', err);
            return { success: false, error: err.message };
        }
    };

    // Content Management Functions

    const uploadChapterContent = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chapter-content')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('chapter-content')
                .getPublicUrl(filePath);

            return { success: true, url: data.publicUrl };
        } catch (error) {
            console.error('Error uploading content:', error);
            return { success: false, error: error.message };
        }
    };

    const addContent = async (contentData) => {
        try {
            let contentUrl = contentData.url;

            // Handle file upload if a file object is provided
            if (contentData.file) {
                const uploadResult = await uploadChapterContent(contentData.file);
                if (!uploadResult.success) {
                    return { success: false, error: uploadResult.error };
                }
                contentUrl = uploadResult.url;
            }

            // Get max order for contents in this chapter
            const { data: maxOrderData } = await supabase
                .from('chapter_contents')
                .select('order')
                .eq('chapter_id', contentData.chapter_id)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            // For exam type, we need to handle exam_id specially
            const newContent = {
                chapter_id: contentData.chapter_id,
                type: contentData.type,
                title: contentData.title,
                description: contentData.description || null,
                url: contentUrl || null,
                order: nextOrder
            };

            // Add exam_id if this is an exam type
            if (contentData.type === 'exam' && contentData.exam_id) {
                newContent.exam_id = contentData.exam_id;
            }

            const { data, error } = await supabase
                .from('chapter_contents')
                .insert([newContent])
                .select(`
                    *,
                    exams (
                        id,
                        title
                    )
                `);

            if (error) throw error;

            // Update local state
            setChapters(prev => prev.map(ch => {
                if (ch.id === contentData.chapter_id) {
                    return {
                        ...ch,
                        chapter_contents: [...(ch.chapter_contents || []), data[0]]
                    };
                }
                return ch;
            }));

            return { success: true, data: data[0] };
        } catch (err) {
            console.error('Error adding content:', err);
            return { success: false, error: err.message };
        }
    };

    const updateContent = async (id, chapterId, updates) => {
        try {
            const { data, error } = await supabase
                .from('chapter_contents')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    exams (
                        id,
                        title,
                        description,
                        duration_minutes,
                        total_marks,
                        number_of_questions,
                        marks_per_question,
                        negative_marking_enabled,
                        negative_marks_per_question,
                        passing_marks,
                        max_attempts
                    )
                `);

            if (error) throw error;

            const updated = data && data[0] ? data[0] : null;

            // Update local state
            setChapters(prev => prev.map(ch => {
                if (ch.id === chapterId) {
                    return {
                        ...ch,
                        chapter_contents: (ch.chapter_contents || []).map(c => c.id === id ? { ...c, ...updated } : c)
                    };
                }
                return ch;
            }));

            return { success: true, data: updated };
        } catch (err) {
            console.error('Error updating content:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteContent = async (id, chapterId) => {
        try {
            // First, get the content to check if it's an exam
            const { data: contentData, error: fetchError } = await supabase
                .from('chapter_contents')
                .select('type, exam_id, chapter_id')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Delete the content
            const { error } = await supabase
                .from('chapter_contents')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // If it's an exam, check if this was the last chapter content for this exam in this course
            if (contentData.type === 'exam' && contentData.exam_id) {
                // Get the course_id from the chapter
                const { data: chapterData, error: chapterError } = await supabase
                    .from('chapters')
                    .select('course_id')
                    .eq('id', contentData.chapter_id)
                    .single();

                if (!chapterError && chapterData) {
                    // Check if there are any other chapter_contents with this exam_id in this course
                    const { data: otherContents, error: checkError } = await supabase
                        .from('chapter_contents')
                        .select('id, chapter_id, chapters!inner(course_id)')
                        .eq('type', 'exam')
                        .eq('exam_id', contentData.exam_id)
                        .eq('chapters.course_id', chapterData.course_id);

                    if (!checkError && (!otherContents || otherContents.length === 0)) {
                        // No other chapters in this course have this exam, remove from course_exams
                        await supabase
                            .from('course_exams')
                            .delete()
                            .eq('course_id', chapterData.course_id)
                            .eq('exam_id', contentData.exam_id);
                    }
                }
            }

            // Update local state
            setChapters(prev => prev.map(ch => {
                if (ch.id === chapterId) {
                    return {
                        ...ch,
                        chapter_contents: ch.chapter_contents.filter(c => c.id !== id)
                    };
                }
                return ch;
            }));

            return { success: true };
        } catch (err) {
            console.error('Error deleting content:', err);
            return { success: false, error: err.message };
        }
    };

    const reorderContents = async (chapterId, reorderedContents) => {
        // Optimistic update
        setChapters(prev => prev.map(ch => {
            if (ch.id === chapterId) {
                return { ...ch, chapter_contents: reorderedContents };
            }
            return ch;
        }));

        try {
            const updates = reorderedContents.map((content, index) => ({
                id: content.id,
                order: index
            }));

            for (const update of updates) {
                const { error } = await supabase
                    .from('chapter_contents')
                    .update({ order: update.order })
                    .eq('id', update.id);

                if (error) throw error;
            }
            return { success: true };
        } catch (err) {
            console.error('Error reordering contents:', err);
            return { success: false, error: err.message };
        }
    };

    return (
        <ChapterContext.Provider value={{
            chapters,
            loading,
            error,
            fetchChapters,
            addChapter,
            updateChapter,
            deleteChapter,
            reorderChapters,
            addContent,
            updateContent,
            deleteContent,
            reorderContents
        }}>
            {children}
        </ChapterContext.Provider>
    );
};
