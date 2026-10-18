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

// POST - Add a reply to a thread
export async function POST(request) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Please login to reply' }, { status: 401 });
        }

        const body = await request.json();
        const { threadId, content } = body;

        if (!threadId || !content) {
            return NextResponse.json({ error: 'Thread ID and content are required' }, { status: 400 });
        }

        // Check if thread exists and is not locked
        const thread = await prisma.discussion_threads.findUnique({
            where: { id: parseInt(threadId) }
        });

        if (!thread || thread.is_deleted) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        if (thread.is_locked) {
            return NextResponse.json({ error: 'This thread is locked' }, { status: 403 });
        }

        // Get member ID
        const member = await prisma.members.findFirst({
            where: {
                OR: [
                    { auth_user_id: user.id },
                    { email: user.email }
                ]
            },
            select: { id: true }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Create reply
        const newReply = await prisma.discussion_replies.create({
            data: {
                thread_id: parseInt(threadId),
                content,
                member_id: member.id
            },
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

        // Update thread's last_activity_at and reply_count
        await prisma.discussion_threads.update({
            where: { id: parseInt(threadId) },
            data: {
                last_activity_at: new Date(),
                reply_count: { increment: 1 }
            }
        });

        return NextResponse.json({
            success: true,
            reply: {
                ...newReply,
                author: newReply.members ? {
                    id: newReply.members.id,
                    name: [newReply.members.first_name, newReply.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                    photo_url: newReply.members.photo_url
                } : null,
                members: undefined
            }
        });
    } catch (error) {
        console.error('Reply POST error:', error);
        return NextResponse.json({ error: 'Failed to add reply', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete a reply (soft delete)
export async function DELETE(request) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const replyId = parseInt(searchParams.get('id'));

        if (!replyId) {
            return NextResponse.json({ error: 'Reply ID is required' }, { status: 400 });
        }

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

        const reply = await prisma.discussion_replies.findUnique({
            where: { id: replyId }
        });

        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(member.roles?.role_name);
        const isAuthor = reply.member_id === member.id;

        if (!isAdmin && !isAuthor) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        await prisma.discussion_replies.update({
            where: { id: replyId },
            data: { is_deleted: true }
        });

        // Decrement reply count
        await prisma.discussion_threads.update({
            where: { id: reply.thread_id },
            data: {
                reply_count: { decrement: 1 }
            }
        });

        return NextResponse.json({ success: true, message: 'Reply deleted' });
    } catch (error) {
        console.error('Reply DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete reply', details: error.message }, { status: 500 });
    }
}
