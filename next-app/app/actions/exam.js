'use server';

import prisma from '@/lib/prisma';

/**
 * Fetch exam questions with options using Prisma (bypasses RLS)
 * Note: exam_questions table doesn't have relations in Prisma, so we use separate queries
 */
export async function getExamQuestionsWithOptions(examId) {
    try {
        const examIdInt = parseInt(examId);
        if (isNaN(examIdInt)) {
            console.error('Invalid exam ID');
            return [];
        }

        // First, fetch exam_questions (just the junction table data)
        const examQuestions = await prisma.exam_questions.findMany({
            where: {
                exam_id: examIdInt
            },
            orderBy: {
                order: 'asc'
            }
        });

        if (!examQuestions || examQuestions.length === 0) {
            return [];
        }

        // Get all question IDs
        const questionIds = examQuestions
            .map(eq => eq.question_id)
            .filter(id => id !== null);

        if (questionIds.length === 0) {
            return examQuestions.map(eq => ({
                id: Number(eq.id),
                exam_id: Number(eq.exam_id),
                question_id: null,
                order: eq.order,
                marks: eq.marks ? Number(eq.marks) : 1,
                section_id: eq.section_id ? Number(eq.section_id) : null,
                is_mandatory: eq.is_mandatory,
                questions: null
            }));
        }

        // Fetch questions with options separately
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
                question_tags: true,
                subjects: true
            }
        });

        // Create a map for quick lookup
        const questionsMap = new Map();
        questions.forEach(q => {
            questionsMap.set(q.id, {
                id: Number(q.id),
                question_text: q.question_text,
                question_type: q.question_type,
                difficulty: q.difficulty_level,
                explanation: q.explanation,
                subjects: q.subjects ? { name: q.subjects.name } : null,
                // Map question_options to options for component compatibility
                options: (q.question_options || []).map(opt => ({
                    id: Number(opt.id),
                    option_label: opt.option_label,
                    option_text: opt.option_text,
                    is_correct: opt.is_correct
                })),
                tags: (q.question_tags || []).map(tag => ({
                    id: Number(tag.id),
                    tag_name: tag.tag_name
                }))
            });
        });

        // Map exam_questions with their associated questions data
        const result = examQuestions.map(eq => ({
            id: Number(eq.id),
            exam_id: Number(eq.exam_id),
            question_id: eq.question_id ? Number(eq.question_id) : null,
            order: eq.order,
            marks: eq.marks ? Number(eq.marks) : 1,
            section_id: eq.section_id ? Number(eq.section_id) : null,
            is_mandatory: eq.is_mandatory,
            questions: eq.question_id ? questionsMap.get(eq.question_id) || null : null
        }));

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error('Error fetching exam questions with options:', error);
        return [];
    }
}

/**
 * Fetch a single exam by ID using Prisma
 */
export async function getExamById(examId) {
    try {
        const examIdInt = parseInt(examId);
        if (isNaN(examIdInt)) {
            return null;
        }

        const exam = await prisma.exams.findUnique({
            where: {
                id: examIdInt
            }
        });

        if (!exam) return null;

        return JSON.parse(JSON.stringify({
            id: Number(exam.id),
            title: exam.title,
            description: exam.description,
            duration_minutes: exam.duration_minutes,
            total_marks: exam.total_marks,
            number_of_questions: exam.number_of_questions,
            status: exam.status,
            type: exam.type, // Added type
            settings: exam.settings, // Added settings
            instructions: exam.instructions, // Added instructions
            pass_percentage: exam.pass_percentage, // Added pass_percentage
            negative_marking_enabled: exam.negative_marking_enabled,
            negative_marks_per_question: exam.negative_marks_per_question,
            randomize_questions: exam.randomize_questions,
            randomize_options: exam.randomize_options,
            detect_tab_switch: exam.detect_tab_switch,
            auto_submit_on_timeout: exam.auto_submit_on_timeout,
            restrict_copy_paste: exam.restrict_copy_paste,
            chapter_id: exam.chapter_id,
            created_at: exam.created_at?.toISOString(),
        }));
    } catch (error) {
        console.error('Error fetching exam:', error);
        return null;
    }
}

/**
 * Fetch exam sections using Prisma
 */
export async function getExamSections(examId) {
    try {
        const examIdInt = parseInt(examId);
        if (isNaN(examIdInt)) return [];

        const sections = await prisma.exam_sections.findMany({
            where: {
                exam_id: examIdInt
            },
            orderBy: {
                section_order: 'asc'
            }
        });

        if (!sections) return [];

        return JSON.parse(JSON.stringify(sections.map(s => ({
            id: Number(s.id),
            exam_id: Number(s.exam_id),
            section_name: s.section_name,
            section_order: s.section_order,
            instructions: s.instructions,
            total_marks: s.total_marks,
            passing_marks: s.passing_marks,
            is_mandatory: s.is_mandatory
        }))));
    } catch (error) {
        console.error('Error fetching exam sections:', error);
        return [];
    }
}
