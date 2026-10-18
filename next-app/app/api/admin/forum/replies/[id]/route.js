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

// PATCH - Restore deleted reply
export async function PATCH(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        const reply = await prisma.discussion_replies.findUnique({
            where: { id: parseInt(id) }
        });

        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        let updateData = {};

        switch (action) {
            case 'restore':
                updateData.is_deleted = false;
                break;
            case 'delete':
                updateData.is_deleted = true;
                break;
            default:
                return NextResponse.json({ error: 'Invalid action. Use "restore" or "delete"' }, { status: 400 });
        }

        const updatedReply = await prisma.discussion_replies.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: `Reply ${action}d successfully`,
            reply: {
                id: updatedReply.id,
                is_deleted: updatedReply.is_deleted
            }
        });
    } catch (error) {
        console.error('Admin Reply PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update reply', details: error.message }, { status: 500 });
    }
}

// DELETE - Hard delete reply permanently
export async function DELETE(request, { params }) {
    try {
        const supabase = await createSupabaseClient();
        const { isAdmin: isAdminUser } = await isAdmin(supabase);

        if (!isAdminUser) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { id } = await params;

        const reply = await prisma.discussion_replies.findUnique({
            where: { id: parseInt(id) },
            select: { thread_id: true }
        });

        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        // Delete the reply
        await prisma.discussion_replies.delete({
            where: { id: parseInt(id) }
        });

        // Update thread reply count
        await prisma.discussion_threads.update({
            where: { id: reply.thread_id },
            data: {
                reply_count: {
                    decrement: 1
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Reply permanently deleted'
        });
    } catch (error) {
        console.error('Admin Reply DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete reply', details: error.message }, { status: 500 });
    }
}
