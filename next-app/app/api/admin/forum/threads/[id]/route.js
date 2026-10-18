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

// GET - Get single thread with all replies (including deleted)
export async function GET(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { id } = await params;

        const thread = await prisma.discussion_threads.findUnique({
            where: { id: parseInt(id) },
            include: {
                members: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        photo_url: true
                    }
                },
                discussion_replies: {
                    orderBy: { created_at: 'asc' },
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
                }
            }
        });

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        // Format response
        const formattedThread = {
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
            } : null,
            replies: thread.discussion_replies.map(reply => ({
                id: reply.id,
                content: reply.content,
                is_deleted: reply.is_deleted,
                created_at: reply.created_at,
                author: reply.members ? {
                    id: reply.members.id,
                    name: [reply.members.first_name, reply.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    email: reply.members.email,
                    photo_url: reply.members.photo_url
                } : null
            }))
        };

        return NextResponse.json({ thread: formattedThread });
    } catch (error) {
        console.error('Admin Forum GET single error:', error);
        return NextResponse.json({ error: 'Failed to fetch thread', details: error.message }, { status: 500 });
    }
}

// PATCH - Update thread (pin, lock, restore)
export async function PATCH(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, value } = body;

        const thread = await prisma.discussion_threads.findUnique({
            where: { id: parseInt(id) }
        });

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        let updateData = {};

        switch (action) {
            case 'pin':
                updateData.is_pinned = value !== undefined ? value : !thread.is_pinned;
                break;
            case 'lock':
                updateData.is_locked = value !== undefined ? value : !thread.is_locked;
                break;
            case 'restore':
                updateData.is_deleted = false;
                break;
            case 'delete':
                updateData.is_deleted = true;
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        updateData.updated_at = new Date();

        const updatedThread = await prisma.discussion_threads.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: `Thread ${action}${action === 'restore' ? 'd' : action.endsWith('e') ? 'd' : 'ed'} successfully`,
            thread: {
                id: updatedThread.id,
                is_pinned: updatedThread.is_pinned,
                is_locked: updatedThread.is_locked,
                is_deleted: updatedThread.is_deleted
            }
        });
    } catch (error) {
        console.error('Admin Forum PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update thread', details: error.message }, { status: 500 });
    }
}

// DELETE - Hard delete thread permanently
export async function DELETE(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { id } = await params;

        // First delete all replies
        await prisma.discussion_replies.deleteMany({
            where: { thread_id: parseInt(id) }
        });

        // Then delete the thread
        await prisma.discussion_threads.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({
            success: true,
            message: 'Thread permanently deleted'
        });
    } catch (error) {
        console.error('Admin Forum DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete thread', details: error.message }, { status: 500 });
    }
}
