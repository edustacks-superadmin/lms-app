import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        if (isNaN(courseId)) {
            return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
        }

        // 1. Fetch Enrollments
        const enrollments = await prisma.enrollments.findMany({
            where: { course_id: courseId },
            orderBy: { created_at: 'desc' }
        });

        if (enrollments.length === 0) {
            return NextResponse.json([]);
        }

        const studentIds = enrollments.map(e => e.student_id);

        // 2. Fetch Student Details (Members)
        const students = await prisma.members.findMany({
            where: {
                id: { in: studentIds }
            },
            select: {
                id: true,
                auth_user_id: true,
                first_name: true,
                last_name: true,
                display_name: true,
                email: true,
                photo_url: true,
                phone_number: true
            }
        });

        // 3. Get course chapters and content stats
        const chapters = await prisma.chapters.findMany({
            where: { course_id: courseId },
            select: { id: true }
        });
        const chapterIds = chapters.map(c => c.id);

        // Get total content count
        let totalContent = 0;
        let totalExams = 0;
        if (chapterIds.length > 0) {
            const contents = await prisma.chapter_contents.findMany({
                where: { chapter_id: { in: chapterIds } },
                select: { id: true, type: true }
            });
            totalContent = contents.length;
            totalExams = contents.filter(c => c.type === 'exam').length;
        }

        // 4. Get exam attempts for students in this course
        const examAttempts = await prisma.exam_attempts.findMany({
            where: {
                member_id: { in: studentIds },
                exam: {
                    chapter_contents: {
                        some: {
                            chapter_id: { in: chapterIds }
                        }
                    }
                }
            },
            select: {
                member_id: true,
                exam_id: true
            }
        });

        // Group exam attempts by student
        const examsByStudent = {};
        examAttempts.forEach(attempt => {
            if (!examsByStudent[attempt.member_id]) {
                examsByStudent[attempt.member_id] = new Set();
            }
            examsByStudent[attempt.member_id].add(attempt.exam_id);
        });

        // 5. Try to get content history if table exists
        let contentHistoryByStudent = {};
        try {
            const contentHistory = await prisma.$queryRaw`
                SELECT member_id, COUNT(DISTINCT content_id) as viewed_count
                FROM member_content_history
                WHERE course_id = ${courseId}
                GROUP BY member_id
            `;
            contentHistory.forEach(row => {
                contentHistoryByStudent[row.member_id] = Number(row.viewed_count);
            });
        } catch (e) {
            // Table might not exist yet, that's okay
            console.log('member_content_history table not available');
        }

        // 6. Merge Data
        const learnerData = enrollments.map(enrollment => {
            const student = students.find(s => s.id === enrollment.student_id);
            const studentExams = examsByStudent[enrollment.student_id];
            const examsCompleted = studentExams ? studentExams.size : 0;
            const attachmentsViewed = contentHistoryByStudent[enrollment.student_id] || 0;

            // Calculate progress percent
            const progressPercent = totalContent > 0
                ? Math.round((attachmentsViewed / totalContent) * 100)
                : 0;

            return {
                enrollment_id: enrollment.id,
                joined_at: enrollment.created_at,
                status: enrollment.status || 'active',
                progress: progressPercent,
                exams_completed: examsCompleted,
                total_exams: totalExams,
                attachments_viewed: attachmentsViewed,
                total_attachments: totalContent,
                student: student || {
                    id: enrollment.student_id,
                    display_name: 'Unknown User',
                    email: generateMaskedEmail(enrollment.student_id?.toString() || 'unknown')
                }
            };
        });

        return NextResponse.json(learnerData);

    } catch (error) {
        console.error('Error fetching learners:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

function generateMaskedEmail(id) {
    return `user-${id.substring(0, 8)}@masked.com`;
}
