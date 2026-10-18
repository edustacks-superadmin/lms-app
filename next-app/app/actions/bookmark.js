'use server';

import prisma from '@/lib/prisma';

/**
 * Fetch user bookmarks with question options using Prisma (bypasses RLS)
 * This is needed because Supabase RLS blocks access to question_options
 * 
 * Note: user_id in question_bookmarks is the member.id (Int), not auth user UUID
 */
export async function getUserBookmarksWithOptions(authUserId) {
    try {
        if (!authUserId) {
            console.error('No user ID provided');
            return [];
        }

        // First, get the member ID from the auth user ID (UUID)
        // The members table has user_id as the auth UUID
        const member = await prisma.members.findFirst({
            where: {
                user_id: authUserId
            },
            select: {
                id: true
            }
        });

        if (!member) {
            console.error('Member not found for auth user:', authUserId);
            return [];
        }

        const memberId = member.id;
        console.log('Found member ID:', memberId, 'for auth user:', authUserId);

        // Fetch bookmarks for this member
        const bookmarks = await prisma.question_bookmarks.findMany({
            where: {
                user_id: memberId
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        console.log('Found bookmarks:', bookmarks?.length);

        if (!bookmarks || bookmarks.length === 0) {
            return [];
        }

        // Get all question IDs
        const questionIds = bookmarks
            .map(b => b.question_id)
            .filter(id => id !== null);

        if (questionIds.length === 0) {
            return [];
        }

        // Fetch questions with their options
        const questions = await prisma.questions.findMany({
            where: {
                id: { in: questionIds }
            },
            include: {
                question_options: {
                    orderBy: {
                        option_label: 'asc'
                    }
                },
                subjects: true
            }
        });

        console.log('Found questions with options:', questions?.length);
        if (questions?.length > 0) {
            console.log('First question options count:', questions[0]?.question_options?.length);
        }

        // Fetch exam links for these questions
        const examQuestions = await prisma.exam_questions.findMany({
            where: {
                question_id: { in: questionIds }
            },
            include: {
                exams: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        // Create maps for quick lookup
        const questionsMap = new Map();
        questions.forEach(q => {
            questionsMap.set(q.id, {
                id: Number(q.id),
                question_text: q.question_text,
                question_type: q.question_type,
                marks: q.marks ? Number(q.marks) : 1,
                explanation: q.explanation,
                difficulty: q.difficulty_level,
                subject_id: q.subject_id ? Number(q.subject_id) : null,
                subjects: q.subjects ? { name: q.subjects.name } : null,
                question_options: (q.question_options || []).map(opt => ({
                    id: Number(opt.id),
                    option_label: opt.option_label,
                    option_text: opt.option_text,
                    is_correct: opt.is_correct
                }))
            });
        });

        // Create exam lookup map (takes first exam for each question)
        const examMap = new Map();
        examQuestions.forEach(eq => {
            if (!examMap.has(eq.question_id) && eq.exams) {
                examMap.set(eq.question_id, {
                    exam_id: Number(eq.exams.id),
                    title: eq.exams.title
                });
            }
        });

        // Build the result
        const result = bookmarks.map(bookmark => {
            const question = questionsMap.get(bookmark.question_id);
            const examInfo = examMap.get(bookmark.question_id);

            return {
                created_at: bookmark.created_at?.toISOString(),
                question_id: bookmark.question_id ? Number(bookmark.question_id) : null,
                question: question || null,
                exam_title: examInfo?.title || 'Unknown Exam',
                subject_name: question?.subjects?.name || 'Uncategorized',
                explanation: question?.explanation || null
            };
        });

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error('Error fetching user bookmarks:', error);
        return [];
    }
}
