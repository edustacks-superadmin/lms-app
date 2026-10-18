import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to create Supabase client
async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Ignore errors
                    }
                },
            },
        }
    );
}

// Helper to check if user is admin
async function isAdmin(supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAdmin: false, user: null, member: null };

    const member = await prisma.members.findFirst({
        where: {
            OR: [
                { auth_user_id: user.id },
                { email: user.email }
            ]
        },
        select: { id: true, role: true, first_name: true, last_name: true }
    });

    if (!member) return { isAdmin: false, user, member: null };

    const adminRoles = ['admin', 'super_admin', 'staff'];
    return {
        isAdmin: adminRoles.includes(member.role),
        user,
        member
    };
}

// GET - Get forum statistics
export async function GET(request) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id') || 10;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const [
            totalThreads,
            activeThreads,
            deletedThreads,
            pinnedThreads,
            lockedThreads,
            totalReplies,
            threadsToday,
            repliesToday,
            threadsThisWeek,
            repliesThisWeek
        ] = await Promise.all([
            // Total threads
            prisma.discussion_threads.count({
                where: { institute_id: BigInt(instituteId) }
            }),
            // Active threads (not deleted)
            prisma.discussion_threads.count({
                where: { institute_id: BigInt(instituteId), is_deleted: false }
            }),
            // Deleted threads
            prisma.discussion_threads.count({
                where: { institute_id: BigInt(instituteId), is_deleted: true }
            }),
            // Pinned threads
            prisma.discussion_threads.count({
                where: { institute_id: BigInt(instituteId), is_pinned: true, is_deleted: false }
            }),
            // Locked threads
            prisma.discussion_threads.count({
                where: { institute_id: BigInt(instituteId), is_locked: true, is_deleted: false }
            }),
            // Total replies (across all threads for this institute)
            prisma.discussion_replies.count({
                where: {
                    discussion_threads: {
                        institute_id: BigInt(instituteId)
                    }
                }
            }),
            // Threads created today
            prisma.discussion_threads.count({
                where: {
                    institute_id: BigInt(instituteId),
                    created_at: { gte: today }
                }
            }),
            // Replies created today
            prisma.discussion_replies.count({
                where: {
                    created_at: { gte: today },
                    discussion_threads: {
                        institute_id: BigInt(instituteId)
                    }
                }
            }),
            // Threads this week
            prisma.discussion_threads.count({
                where: {
                    institute_id: BigInt(instituteId),
                    created_at: { gte: weekAgo }
                }
            }),
            // Replies this week
            prisma.discussion_replies.count({
                where: {
                    created_at: { gte: weekAgo },
                    discussion_threads: {
                        institute_id: BigInt(instituteId)
                    }
                }
            })
        ]);

        // Get most active threads (by reply count)
        const mostActiveThreads = await prisma.discussion_threads.findMany({
            where: {
                institute_id: BigInt(instituteId),
                is_deleted: false
            },
            orderBy: { reply_count: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                reply_count: true,
                created_at: true
            }
        });

        return NextResponse.json({
            stats: {
                threads: {
                    total: totalThreads,
                    active: activeThreads,
                    deleted: deletedThreads,
                    pinned: pinnedThreads,
                    locked: lockedThreads
                },
                replies: {
                    total: totalReplies
                },
                activity: {
                    threadsToday,
                    repliesToday,
                    threadsThisWeek,
                    repliesThisWeek
                },
                mostActiveThreads
            }
        });
    } catch (error) {
        console.error('Admin Forum Stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats', details: error.message }, { status: 500 });
    }
}
