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

// GET - List all threads
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const instituteId = searchParams.get('institute_id') || 10;

        const skip = (page - 1) * limit;

        const [threads, total] = await Promise.all([
            prisma.discussion_threads.findMany({
                where: {
                    institute_id: BigInt(instituteId),
                    is_deleted: false
                },
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
                            photo_url: true
                        }
                    }
                }
            }),
            prisma.discussion_threads.count({
                where: {
                    institute_id: BigInt(instituteId),
                    is_deleted: false
                }
            })
        ]);

        // Serialize BigInt
        const formattedThreads = threads.map(thread => ({
            ...thread,
            id: thread.id,
            institute_id: thread.institute_id?.toString(),
            author: thread.members ? {
                id: thread.members.id,
                name: [thread.members.first_name, thread.members.last_name].filter(Boolean).join(' ') || 'Unknown',
                photo_url: thread.members.photo_url
            } : null,
            members: undefined
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
        console.error('Forum GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch threads', details: error.message }, { status: 500 });
    }
}

// POST - Create a new thread
export async function POST(request) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Please login to create a thread' }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, instituteId = 10 } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
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

        const newThread = await prisma.discussion_threads.create({
            data: {
                title,
                content,
                member_id: member.id,
                institute_id: BigInt(instituteId),
                last_activity_at: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            thread: {
                ...newThread,
                institute_id: newThread.institute_id?.toString()
            }
        });
    } catch (error) {
        console.error('Forum POST error:', error);
        return NextResponse.json({ error: 'Failed to create thread', details: error.message }, { status: 500 });
    }
}
