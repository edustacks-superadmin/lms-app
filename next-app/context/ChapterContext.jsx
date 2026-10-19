import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const ChapterContext = createContext();

export const useChapters = () => useContext(ChapterContext);

export const ChapterProvider = ({ children }) => {
    const { institute } = useInstitute();
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

                                updatedContent = {
                                    ...updatedContent,
                                    exams: {
                                        ...updatedContent.exams,
                                        total_marks: totalMarks
                                    }
                                };
                            }
                        }
                    }
                    return content;
                }));

                return {
                    ...chapter,
                    title: chapter.name, // Map name to title for UI
                    image: chapter.icon, // Map icon to image for UI
                    chapter_contents: contentsWithMarks.sort((a, b) => a.order - b.order)
                };
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
                name: chapterData.title, // Map title to name
                // description removed as it does not exist in schema
                icon: chapterData.image, // Map image to icon
                order: nextOrder,
                parent_id: chapterData.parent_id || null
                // institute_id removed to rely on DB default/trigger and avoid RLS conflict
            };
            console.log('ChapterContext: Adding chapter WITHOUT institute_id:', newChapter);

            const { data, error } = await supabase
                .from('chapters')
                .insert([newChapter])
                .select();

            if (error) throw error;

            // Initialize with empty contents and map DB fields to UI fields
            const chapterWithContents = {
                ...data[0],
                title: data[0].name,
                image: data[0].icon,
                chapter_contents: []
            };

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
            // Map UI fields to DB columns
            if (dbUpdates.image !== undefined) {
                dbUpdates.icon = dbUpdates.image;
                delete dbUpdates.image;
            }
            if (dbUpdates.title) {
                dbUpdates.name = dbUpdates.title;
                delete dbUpdates.title;
            }
            if (dbUpdates.description) delete dbUpdates.description;

            const { data, error } = await supabase
                .from('chapters')
                .update(dbUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;

            const mappedData = { ...data[0], title: data[0].name, image: data[0].icon };
            setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, ...mappedData } : ch));
            return { success: true, data: mappedData };
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
        // Optimistic update: Update the order of the passed chapters in the main state
        setChapters(prev => {
            const updatedChapters = prev.map(ch => {
                const found = reorderedChapters.find(c => c.id === ch.id);
                if (found) {
                    // Update order based on index in reorderedChapters
                    return { ...ch, order: reorderedChapters.indexOf(found) };
                }
                return ch;
            });
            return updatedChapters;
        });

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
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).slice(2, 8);
            const fileName = `${timestamp}_${randomStr}.${fileExt}`;
            const filePath = `chapter-content/${fileName}`;

            // Upload to R2 via server action
            const { uploadImage } = await import('../app/actions/images');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'chapter-content');

            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return { success: true, url: result.url };
        } catch (error) {
            console.error('Error uploading content to R2:', error);
            return { success: false, error: error.message };
        }
    };

    const addContent = async (contentData) => {
        try {
            let contentUrl = contentData.content_url || contentData.url;

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
                // description removed as it does not exist in schema
                url: contentUrl // Map content_url to url
                // institute_id removed
            };
            console.log('ChapterContext: Adding content WITHOUT institute_id:', newContent);

            // Add exam_id if this is an exam type
            if (contentData.type === 'exam' && contentData.exam_id) {
                newContent.exam_id = contentData.exam_id;
            }

            // Add available_from if set (datetime-local gives local time, convert to ISO)
            if (contentData.available_from) {
                // datetime-local input gives local time like "2026-01-15T19:01"
                // We need to convert it to full ISO string for database
                newContent.available_from = new Date(contentData.available_from).toISOString();
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

            // 📢 Send immediate notification if exam is added with past/no start date
            if (contentData.type === 'exam' && contentData.exam_id) {
                try {
                    // Get exam details to check start_date
                    const { data: examData } = await supabase
                        .from('exams')
                        .select('id, title, start_date')
                        .eq('id', contentData.exam_id)
                        .single();

                    if (examData) {
                        const now = new Date();
                        const startDate = examData.start_date ? new Date(examData.start_date) : null;

                        // Send immediate notification if no start_date or start_date is in the past
                        if (!startDate || startDate <= now) {
                            // Get course info from chapter
                            const { data: chapterData } = await supabase
                                .from('chapters')
                                .select('course_id, courses(title)')
                                .eq('id', contentData.chapter_id)
                                .single();

                            if (chapterData?.course_id) {
                                // Call notifications API
                                fetch('/api/notifications/send', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        course_id: chapterData.course_id,
                                        content_id: data[0].id,
                                        content_name: examData.title,
                                        course_name: chapterData.courses?.title || 'Course',
                                        send_push: true,
                                        push_title: '📝 New Exam Available!',
                                        push_summary: `"${examData.title}" is now available. Start now!`
                                    })
                                }).catch(err => console.warn('Notification error:', err));

                                console.log('📢 Immediate exam notification triggered for:', examData.title);
                            }
                        }
                    }
                } catch (notifyErr) {
                    console.warn('Failed to send exam notification:', notifyErr);
                    // Don't fail the main operation
                }
            }

            // 📢 Send notification for PDF or video content (immediate if no date or past date)
            if (contentData.type === 'pdf' || contentData.type === 'video') {
                try {
                    const now = new Date();
                    const availableFrom = contentData.available_from ? new Date(contentData.available_from) : null;

                    // Only send immediate notification if no available_from or it's in the past
                    if (!availableFrom || availableFrom <= now) {
                        // Get course info from chapter
                        const { data: chapterData } = await supabase
                            .from('chapters')
                            .select('course_id, courses(title)')
                            .eq('id', contentData.chapter_id)
                            .single();

                        if (chapterData?.course_id) {
                            const contentIcon = contentData.type === 'pdf' ? '📄' : '🎬';
                            const contentLabel = contentData.type === 'pdf' ? 'PDF' : 'Video';

                            // Call notifications API
                            fetch('/api/notifications/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    course_id: chapterData.course_id,
                                    content_id: data[0].id,
                                    content_name: contentData.title,
                                    course_name: chapterData.courses?.title || 'Course',
                                    send_push: true,
                                    push_title: `${contentIcon} New ${contentLabel} Added!`,
                                    push_summary: `"${contentData.title}" is now available in ${chapterData.courses?.title || 'your course'}.`
                                })
                            }).catch(err => console.warn('Notification error:', err));

                            // Mark as notified
                            await supabase
                                .from('chapter_contents')
                                .update({ notification_sent: true })
                                .eq('id', data[0].id);

                            console.log(`📢 ${contentLabel} notification triggered for:`, contentData.title);
                        }
                    } else {
                        console.log(`📅 ${contentData.title} scheduled for ${availableFrom.toISOString()}, notification will be sent by cron`);
                    }
                } catch (notifyErr) {
                    console.warn('Failed to send content notification:', notifyErr);
                    // Don't fail the main operation
                }
            }

            return { success: true, data: data[0] };
        } catch (err) {
            console.error('Error adding content:', err);
            return { success: false, error: err.message };
        }
    };

    const updateContent = async (id, chapterId, updates) => {
        try {
            const dbUpdates = { ...updates };

            // Handle file upload - if replacing with new file, delete old one first
            if (dbUpdates.file) {
                // Get current content to find old URL
                const { data: currentContent } = await supabase
                    .from('chapter_contents')
                    .select('url, type')
                    .eq('id', id)
                    .single();

                // 🗑️ Delete old file from storage if it exists
                // 🗑️ Delete old file (R2 first, then Supabase fallback)
                if (currentContent?.url && currentContent.type !== 'exam') {
                    try {
                        const { deleteImage } = await import('../app/actions/images');
                        const result = await deleteImage(currentContent.url);

                        if (!result.success && result.error === 'Not an R2 URL, cannot delete') {
                            // Fallback to Supabase deletion
                            const urlParts = currentContent.url.split('/chapter-content/');
                            if (urlParts.length > 1) {
                                const filePath = decodeURIComponent(urlParts[1]);
                                console.log('🗑️ Deleting old file from Supabase:', filePath);
                                await supabase.storage.from('chapter-content').remove([filePath]);
                            }
                        } else if (result.success) {
                            console.log('✅ Old file deleted from R2');
                        }
                    } catch (cleanupError) {
                        console.warn('Old file cleanup error:', cleanupError.message);
                    }
                }

                // Upload new file
                const uploadResult = await uploadChapterContent(dbUpdates.file);
                if (!uploadResult.success) throw new Error(uploadResult.error?.message || 'Upload failed');
                dbUpdates.url = uploadResult.url;
            }

            // Always remove 'file' as it's not a DB column
            delete dbUpdates.file;

            // Map content_url to url
            if (dbUpdates.content_url) {
                dbUpdates.url = dbUpdates.content_url;
                delete dbUpdates.content_url;
            }

            // Ensure no institute_id in updates
            delete dbUpdates.institute_id;
            delete dbUpdates.description;

            const { data, error } = await supabase
                .from('chapter_contents')
                .update(dbUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;

            // Update local state
            setChapters(prev => prev.map(ch => {
                if (ch.id === chapterId) {
                    return {
                        ...ch,
                        chapter_contents: ch.chapter_contents.map(c => c.id === id ? data[0] : c)
                    };
                }
                return ch;
            }));

            return { success: true, data: data[0] };
        } catch (err) {
            console.error('Error updating content:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteContent = async (id, chapterId) => {
        try {
            // First, get the content to check type and get the file URL
            const { data: contentData, error: fetchError } = await supabase
                .from('chapter_contents')
                .select('type, exam_id, chapter_id, url')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // 🗑️ Delete file from Supabase Storage if URL exists
            // 🗑️ Delete file (R2 first, then Supabase fallback)
            if (contentData.url && contentData.type !== 'exam') {
                try {
                    const { deleteImage } = await import('../app/actions/images');
                    const result = await deleteImage(contentData.url);

                    if (!result.success && result.error === 'Not an R2 URL, cannot delete') {
                        // Fallback to Supabase deletion
                        const urlParts = contentData.url.split('/chapter-content/');
                        if (urlParts.length > 1) {
                            const filePath = decodeURIComponent(urlParts[1]);
                            console.log('🗑️ Deleting file from Supabase:', filePath);

                            const { error: deleteError } = await supabase.storage
                                .from('chapter-content')
                                .remove([filePath]);

                            if (deleteError) {
                                console.warn('Warning: Could not delete file from Supabase:', deleteError.message);
                            } else {
                                console.log('✅ File deleted from Supabase:', filePath);
                            }
                        }
                    } else if (result.success) {
                        console.log('✅ File deleted from R2');
                    }
                } catch (storageError) {
                    console.warn('Storage cleanup error (continuing):', storageError.message);
                }
            }

            // Delete the content from database
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
                // Update the order property of each content item to match its new index
                const updatedContents = reorderedContents.map((content, index) => ({
                    ...content,
                    order: index
                }));
                return { ...ch, chapter_contents: updatedContents };
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

    const copyChapter = async (chapterId, targetCourseId, targetParentId = null) => {
        try {
            // 1. Fetch original chapter
            const { data: originalChapter, error: fetchError } = await supabase
                .from('chapters')
                .select('*')
                .eq('id', chapterId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Get max order in target
            const { data: maxOrderData } = await supabase
                .from('chapters')
                .select('order')
                .eq('course_id', targetCourseId)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            // 3. Create new chapter
            const { data: newChapter, error: insertError } = await supabase
                .from('chapters')
                .insert([{
                    course_id: targetCourseId,
                    name: originalChapter.name,
                    icon: originalChapter.icon,
                    order: nextOrder,
                    parent_id: targetParentId
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 4. Fetch original contents
            const { data: contents } = await supabase
                .from('chapter_contents')
                .select('*')
                .eq('chapter_id', chapterId);

            if (contents && contents.length > 0) {
                // 5. Duplicate contents
                const newContents = contents.map(content => ({
                    chapter_id: newChapter.id,
                    type: content.type,
                    title: content.title,
                    url: content.url,
                    exam_id: content.exam_id,
                    available_from: content.available_from,
                    order: content.order
                }));

                const { error: contentError } = await supabase
                    .from('chapter_contents')
                    .insert(newContents);

                if (contentError) throw contentError;
            }

            // If target is same course, update state
            // Otherwise, user might need to switch courses to see it
            // We can just refetch if we are in the target course context, but here we don't know easily.
            // For simplicity, we just return success. Calling component can trigger refetch if needed.

            return { success: true };
        } catch (err) {
            console.error('Error copying chapter:', err);
            return { success: false, error: err.message };
        }
    };

    const moveChapter = async (chapterId, targetCourseId, targetParentId = null) => {
        try {
            // 1. Get max order in target
            const { data: maxOrderData } = await supabase
                .from('chapters')
                .select('order')
                .eq('course_id', targetCourseId)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            const { error } = await supabase
                .from('chapters')
                .update({
                    course_id: targetCourseId,
                    parent_id: targetParentId,
                    order: nextOrder
                })
                .eq('id', chapterId);

            if (error) throw error;

            // Update local state by removing it (since it might have moved to another course)
            setChapters(prev => prev.filter(ch => ch.id !== chapterId));

            return { success: true };
        } catch (err) {
            console.error('Error moving chapter:', err);
            return { success: false, error: err.message };
        }
    };

    const copyContent = async (contentId, targetChapterId) => {
        try {
            // 1. Fetch original content
            const { data: original, error: fetchError } = await supabase
                .from('chapter_contents')
                .select('*')
                .eq('id', contentId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Get max order in target chapter
            const { data: maxOrderData } = await supabase
                .from('chapter_contents')
                .select('order')
                .eq('chapter_id', targetChapterId)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            // 3. Insert new content
            const { data: newContent, error: insertError } = await supabase
                .from('chapter_contents')
                .insert([{
                    chapter_id: targetChapterId,
                    type: original.type,
                    title: original.title,
                    url: original.url,
                    exam_id: original.exam_id,
                    available_from: original.available_from,
                    order: nextOrder
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // Update state ONLY if target chapter is in current list
            setChapters(prev => prev.map(ch => {
                if (ch.id === targetChapterId) {
                    return {
                        ...ch,
                        chapter_contents: [...(ch.chapter_contents || []), newContent]
                    };
                }
                return ch;
            }));

            return { success: true };
        } catch (err) {
            console.error('Error copying content:', err);
            return { success: false, error: err.message };
        }
    };

    const moveContent = async (contentId, targetChapterId, sourceChapterId) => {
        try {
            // 1. Get max order in target chapter
            const { data: maxOrderData } = await supabase
                .from('chapter_contents')
                .select('order')
                .eq('chapter_id', targetChapterId)
                .order('order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;

            const { data, error } = await supabase
                .from('chapter_contents')
                .update({
                    chapter_id: targetChapterId,
                    order: nextOrder
                })
                .eq('id', contentId)
                .select()
                .single();

            if (error) throw error;

            // Update state: Remove from old chapter, Add to new chapter (if loaded)
            setChapters(prev => prev.map(ch => {
                if (ch.id === sourceChapterId) {
                    return {
                        ...ch,
                        chapter_contents: ch.chapter_contents.filter(c => c.id !== contentId)
                    };
                }
                if (ch.id === targetChapterId) {
                    return {
                        ...ch,
                        chapter_contents: [...(ch.chapter_contents || []), data]
                    };
                }
                return ch;
            }));

            return { success: true };
        } catch (err) {
            console.error('Error moving content:', err);
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
            reorderContents,
            copyChapter,
            moveChapter,
            copyContent,
            moveContent
        }}>
            {children}
        </ChapterContext.Provider>
    );
};
