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

// GET - Get a single thread with replies
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const threadId = parseInt(id);

        if (!threadId) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
        }

        const thread = await prisma.discussion_threads.findUnique({
            where: { id: threadId },
            include: {
                members: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        photo_url: true
                    }
                }
            }
        });

        if (!thread || thread.is_deleted) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        // Get replies
        const replies = await prisma.discussion_replies.findMany({
            where: {
                thread_id: threadId,
                is_deleted: false
            },
            orderBy: { created_at: 'asc' },
            include: {
                members: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        photo_url: true
                    }
                }
            }
        });

        return NextResponse.json({
            thread: {
                ...thread,
                institute_id: thread.institute_id?.toString(),
                author: thread.members ? {
                    id: thread.members.id,
                    name: [thread.members.first_name, thread.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: thread.members.photo_url
                } : null,
                members: undefined
            },
            replies: replies.map(reply => ({
                ...reply,
                author: reply.members ? {
                    id: reply.members.id,
                    name: [reply.members.first_name, reply.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: reply.members.photo_url
                } : null,
                members: undefined
            }))
        });
    } catch (error) {
        console.error('Forum Thread GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch thread', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete a thread (soft delete)
export async function DELETE(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const threadId = parseInt(id);

        // Get member and check permissions
        const member = await prisma.members.findFirst({
            where: {
                OR: [
                    { auth_user_id: user.id },
                    { email: user.email }
                ]
            },
            include: {
                roles: {
                    select: { role_name: true }
                }
            }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        const thread = await prisma.discussion_threads.findUnique({
            where: { id: threadId }
        });

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(member.roles?.role_name);
        const isAuthor = thread.member_id === member.id;

        if (!isAdmin && !isAuthor) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        await prisma.discussion_threads.update({
            where: { id: threadId },
            data: { is_deleted: true }
        });

        return NextResponse.json({ success: true, message: 'Thread deleted' });
    } catch (error) {
        console.error('Forum Thread DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete thread', details: error.message }, { status: 500 });
    }
}
