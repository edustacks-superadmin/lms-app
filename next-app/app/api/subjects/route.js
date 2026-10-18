import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Using Prisma for efficient aggregation

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const search = searchParams.get('search') || '';
        const instituteId = parseInt(searchParams.get('instituteId'));
        const pageSize = 20;

        // Skip is 0-indexed count to skip
        const skip = (page - 1) * pageSize;

        if (!instituteId) {
            return NextResponse.json({
                subjects: [],
                allChildren: [],
                pagination: { currentPage: 1, pageSize, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false }
            });
        }

        // If searching, we fetch flat list matching search
        if (search) {
            // Count total matching
            const totalCount = await prisma.subjects.count({
                where: {
                    institute_id: instituteId,
                    name: {
                        contains: search,
                        mode: 'insensitive' // ilike
                    }
                }
            });

            // Fetch matching subjects
            const searchResults = await prisma.subjects.findMany({
                where: {
                    institute_id: instituteId,
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                select: {
                    id: true,
                    name: true,
                    parent_id: true,
                    testpress_id: true,
                    created_at: true
                },
                orderBy: { name: 'asc' }
            });

            // Get IDs
            const subjectIds = searchResults.map(s => s.id);
            let questionCounts = {};

            if (subjectIds.length > 0) {
                // Group by subject_id to get counts efficiently
                const counts = await prisma.questions.groupBy({
                    by: ['subject_id'],
                    where: {
                        institute_id: instituteId,
                        subject_id: { in: subjectIds }
                    },
                    _count: {
                        _all: true
                    }
                });

                counts.forEach(c => {
                    questionCounts[c.subject_id] = c._count._all;
                });
            }

            const mappedResults = searchResults.map(subject => ({
                ...subject,
                questionCount: questionCounts[subject.id] || 0
            }));

            return NextResponse.json({
                subjects: mappedResults,
                allChildren: [],
                pagination: {
                    currentPage: 1,
                    pageSize: mappedResults.length,
                    totalCount: totalCount,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            });
        }

        // Normal View: Top Level (Paginated) + All Children (For Tree)

        // 1. Get Top Level Subjects (Paginated)
        const [totalCount, topLevelSubjects] = await Promise.all([
            prisma.subjects.count({
                where: {
                    institute_id: instituteId,
                    parent_id: null
                }
            }),
            prisma.subjects.findMany({
                where: {
                    institute_id: instituteId,
                    parent_id: null
                },
                take: pageSize,
                skip: skip,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    parent_id: true,
                    testpress_id: true,
                    created_at: true
                }
            })
        ]);

        // 2. Get All Children (to build the tree)
        const allChildren = await prisma.subjects.findMany({
            where: {
                institute_id: instituteId,
                parent_id: { not: null }
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                parent_id: true,
                testpress_id: true,
                created_at: true
            }
        });

        // 3. Get Question Counts for ALL relevant subjects (top level + all children)
        // We fetch counts for everything to support recursive rollups
        // Note: Aggregating all counts in one query is efficient enough (returns one row per subject ID with count > 0)

        const allSubjectIds = [
            ...topLevelSubjects.map(s => s.id),
            ...allChildren.map(s => s.id)
        ];

        let questionCounts = {};

        if (allSubjectIds.length > 0) {
            // Using Prisma groupBy avoids the 1000 row limit of Supabase client
            const counts = await prisma.questions.groupBy({
                by: ['subject_id'],
                where: {
                    institute_id: instituteId,
                    subject_id: { in: allSubjectIds }
                },
                _count: {
                    _all: true
                }
            });

            counts.forEach(c => {
                questionCounts[c.subject_id] = c._count._all;
            });
        }

        // 4. Recursive Rollup Logic
        const subjectMap = {};
        [...topLevelSubjects, ...allChildren].forEach(s => {
            subjectMap[s.id] = {
                ...s,
                own_count: questionCounts[s.id] || 0,
                total_count: 0,
                children: []
            };
        });

        // Build tree
        Object.values(subjectMap).forEach(node => {
            if (node.parent_id && subjectMap[node.parent_id]) {
                subjectMap[node.parent_id].children.push(node);
            }
        });

        // Compute Totals
        const computedNodes = new Set();
        const computeTotalCount = (nodeId) => {
            const node = subjectMap[nodeId];
            if (!node) return 0;
            if (computedNodes.has(nodeId)) return node.total_count;

            let sum = node.own_count;
            node.children.forEach(child => {
                sum += computeTotalCount(child.id);
            });

            node.total_count = sum;
            computedNodes.add(nodeId);
            return sum;
        };

        // Compute for all
        Object.keys(subjectMap).forEach(id => computeTotalCount(parseInt(id)));

        // Map back
        const mappedSubjects = topLevelSubjects.map(subject => ({
            ...subject,
            questionCount: subjectMap[subject.id]?.total_count || 0
        }));

        const mappedChildren = allChildren.map(subject => ({
            ...subject,
            questionCount: subjectMap[subject.id]?.total_count || 0
        }));

        const totalPages = Math.ceil(totalCount / pageSize);

        return NextResponse.json({
            subjects: mappedSubjects,
            allChildren: mappedChildren,
            pagination: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subjects' },
            { status: 500 }
        );
    }
}
