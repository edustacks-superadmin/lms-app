'use server';

import prisma from '@/lib/prisma';

/**
 * Fetch question options by question IDs using Prisma (bypasses RLS)
 * This is needed because Supabase RLS blocks access to question_options
 */
export async function getQuestionOptionsByIds(questionIds) {
    try {
        if (!questionIds || questionIds.length === 0) {
            return [];
        }

        const options = await prisma.question_options.findMany({
            where: {
                question_id: { in: questionIds }
            },
            orderBy: {
                option_label: 'asc'
            }
        });

        return JSON.parse(JSON.stringify(options.map(opt => ({
            id: Number(opt.id),
            question_id: Number(opt.question_id),
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            option_label: opt.option_label
        }))));
    } catch (error) {
        console.error('Error fetching question options:', error);
        return [];
    }
}

/**
 * Submit a question report using Prisma (bypasses RLS)
 */
export async function submitQuestionReport({ userId, questionId, reportType, comment, instituteId }) {
    try {
        const report = await prisma.question_reports.create({
            data: {
                user_id: userId,
                question_id: questionId,
                report_type: reportType,
                comment: comment,
                status: 'pending',
                institute_id: instituteId ? BigInt(instituteId) : BigInt(10)
            }
        });

        return { success: true, id: Number(report.id) };
    } catch (error) {
        console.error('Error submitting question report:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch all question reports using Prisma (bypasses RLS)
 */
export async function fetchQuestionReports({ page = 1, limit = 20, status = 'all', issueType = 'all', search = '' } = {}) {
    try {
        const skip = (page - 1) * limit;
        const where = {};

        if (status !== 'all') {
            where.status = status;
        }

        if (issueType !== 'all') {
            where.report_type = { contains: issueType, mode: 'insensitive' };
        }

        if (search) {
            where.OR = [
                { comment: { contains: search, mode: 'insensitive' } },
                // We can't easily search relations deeply in one go with Prisma without joining,
                // so for now basic search on comment.
                // Advanced search would require distinct queries or raw SQL.
            ];
        }

        // Get total count for pagination
        const total = await prisma.question_reports.count({ where });

        const reports = await prisma.question_reports.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip,
            take: limit
        });

        if (!reports || reports.length === 0) {
            return { reports: [], total: 0, page, totalPages: 0 };
        }

        // Extract IDs for bulk fetching
        const questionIds = [...new Set(reports.map(r => r.question_id))];
        const userIds = [...new Set(reports.map(r => r.user_id))];

        // Fetch Related Questions
        const questions = await prisma.questions.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, question_text: true, question_type: true }
        });

        // Fetch Related Members
        // Assuming user_id in reports table corresponds to members.id (Int)
        const members = await prisma.members.findMany({
            where: { id: { in: userIds } },
            select: { id: true, auth_user_id: true, first_name: true, last_name: true, display_name: true, email: true }
        });

        // Map and enrich data
        const enrichedReports = reports.map(report => {
            const question = questions.find(q => q.id === report.question_id);
            const member = members.find(m => m.id === report.user_id);

            return {
                ...report,
                exam_questions: {
                    questions: question || { question_text: 'Question not found', question_type: 'unknown' }
                },
                reporter: member ? {
                    full_name: member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'No Name',
                    email: member.email,
                    user_id: member.auth_user_id,
                    member_id: member.id // Needed for linking
                } : { full_name: 'Unknown User', email: 'N/A' }
            };
        });

        return {
            reports: JSON.parse(JSON.stringify(enrichedReports, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };

    } catch (error) {
        console.error('Error fetching reports:', error);
        // Throwing error so the client can handle it
        throw new Error('Failed to fetch reports: ' + error.message);
    }
}

/**
 * Update question report status
 */
export async function updateQuestionReportStatus(reportId, status) {
    try {
        const updated = await prisma.question_reports.update({
            where: { id: reportId },
            data: { status }
        });
        return {
            success: true,
            data: JSON.parse(JSON.stringify(updated, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ))
        };
    } catch (error) {
        console.error('Error updating report status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete question report
 */
export async function deleteQuestionReport(reportId) {
    try {
        await prisma.question_reports.delete({
            where: { id: reportId }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting report:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk resolve reports
 */
export async function bulkResolveReports(reportIds) {
    try {
        await prisma.question_reports.updateMany({
            where: {
                id: { in: reportIds }
            },
            data: {
                status: 'resolved'
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error bulk resolving reports:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk delete reports
 */
export async function bulkDeleteReports(reportIds) {
    try {
        await prisma.question_reports.deleteMany({
            where: {
                id: { in: reportIds }
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error bulk deleting reports:', error);
        return { success: false, error: error.message };
    }
}
