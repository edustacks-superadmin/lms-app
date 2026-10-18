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

// GET - List all threads (admin view - includes deleted)
export async function GET(request) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser, member } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all'; // all, active, deleted, locked, pinned
        const instituteId = searchParams.get('institute_id') || 10;

        const skip = (page - 1) * limit;

        // Build where clause
        let whereClause = {
            institute_id: BigInt(instituteId)
        };

        // Apply status filters
        switch (status) {
            case 'active':
                whereClause.is_deleted = false;
                break;
            case 'deleted':
                whereClause.is_deleted = true;
                break;
            case 'locked':
                whereClause.is_locked = true;
                whereClause.is_deleted = false;
                break;
            case 'pinned':
                whereClause.is_pinned = true;
                whereClause.is_deleted = false;
                break;
            // 'all' shows everything including deleted
        }

        // Apply search if provided
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [threads, total] = await Promise.all([
            prisma.discussion_threads.findMany({
                where: whereClause,
                orderBy: [
                    { is_pinned: 'desc' },
                    { last_activity_at: 'desc' }
                ],
                skip,
                take: limit,
                include: {
                    members: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            photo_url: true
                        }
                    }
                }
            }),
            prisma.discussion_threads.count({
                where: whereClause
            })
        ]);

        // Serialize BigInt and format response
        const formattedThreads = threads.map(thread => ({
            id: thread.id,
            title: thread.title,
            content: thread.content,
            is_pinned: thread.is_pinned,
            is_locked: thread.is_locked,
            is_deleted: thread.is_deleted,
            reply_count: thread.reply_count,
            created_at: thread.created_at,
            updated_at: thread.updated_at,
            last_activity_at: thread.last_activity_at,
            institute_id: thread.institute_id?.toString(),
            author: thread.members ? {
                id: thread.members.id,
                name: [thread.members.first_name, thread.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                email: thread.members.email,
                photo_url: thread.members.photo_url
            } : null
        }));

        return NextResponse.json({
            threads: formattedThreads,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Admin Forum GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch threads', details: error.message }, { status: 500 });
    }
}
