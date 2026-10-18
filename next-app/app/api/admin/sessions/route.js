import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


// Helper to parse User Agent
const parseUserAgent = (uaString) => {
    if (!uaString) return { device: 'Unknown', os: 'Unknown', browser: 'Unknown' };

    // Simple custom parsing if ua-parser-js isn't available, or use reliable regex
    // But since we can't easily install new packages, let's use a robust custom parser similar to the one in MemberDetails
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device = 'Desktop';

    if (uaString.includes('Mobile') || uaString.includes('Android') || uaString.includes('iPhone')) {
        device = 'Mobile';
    } else if (uaString.includes('iPad') || uaString.includes('Tablet')) {
        device = 'Tablet';
    }

    // Browser
    if (uaString.includes('Chrome')) browser = 'Chrome';
    else if (uaString.includes('Firefox')) browser = 'Firefox';
    else if (uaString.includes('Safari')) browser = 'Safari';
    else if (uaString.includes('Edge')) browser = 'Edge';

    // OS
    if (uaString.includes('Android')) {
        const match = uaString.match(/Android\s([0-9.]+)/);
        os = match ? `Android ${match[1]}` : 'Android';
    } else if (uaString.includes('iPhone') || uaString.includes('iPad')) {
        os = 'iOS';
    } else if (uaString.includes('Windows')) {
        os = 'Windows';
    } else if (uaString.includes('Mac')) {
        os = 'macOS';
    } else if (uaString.includes('Linux')) {
        os = 'Linux';
    }

    return { device, os, browser, name: `${browser} on ${os}` };
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const instituteId = searchParams.get('instituteId');
        const email = searchParams.get('email'); // Optional specific email filter

        if (!instituteId) {
            console.log('Session API: Missing instituteId');
            return NextResponse.json({ sessions: [], total: 0 });
        }

        console.log('Session API: Fetching members for institute', instituteId);

        // Build Member Query
        const memberWhere = {
            institute_id: parseInt(instituteId),
            auth_user_id: { not: null }
        };

        if (email) {
            memberWhere.email = { equals: email, mode: 'insensitive' };
        }

        // 1. Get members for this institute
        const members = await prisma.members.findMany({
            where: memberWhere,
            select: {
                id: true,
                auth_user_id: true,
                email: true,
                first_name: true,
                last_name: true,
                photo_url: true
            }
        });
        console.log('Session API: Found members with auth_user_id:', members.length);

        const memberMap = members.reduce((acc, member) => {
            if (member.auth_user_id) {
                acc[member.auth_user_id] = member;
            }
            return acc;
        }, {});

        const authUserIds = Object.keys(memberMap);

        if (authUserIds.length === 0) {
            return NextResponse.json({ sessions: [], total: 0 });
        }

        // 2. Query auth.sessions using Raw SQL with explicit UUID casting
        // This mirrors the working logic in app/actions/user.js which casts inputs to UUID.
        const uuidList = authUserIds.map(id => `'${id}'::uuid`).join(',');

        console.log(`Session API: Querying auth.sessions for ${authUserIds.length} users`);

        const sessionsRaw = await prisma.$queryRawUnsafe(`
            SELECT 
                id, 
                user_id, 
                created_at, 
                updated_at, 
                ip, 
                user_agent 
            FROM auth.sessions 
            WHERE user_id IN (${uuidList})
            ORDER BY updated_at DESC
        `);

        console.log('Session API: Sessions found:', sessionsRaw.length);

        // 3. Process and Filter in Memory
        let processedSessions = sessionsRaw.map(session => {
            const member = memberMap[session.user_id];
            const uaString = session.user_agent || '';
            const ua = parseUserAgent(uaString);

            // Handle different field names from model vs raw
            const lastActive = session.updated_at || session.last_active;
            const ip = session.ip;

            return {
                id: session.id,
                user_id: session.user_id,
                member: {
                    id: member.id,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    email: member.email,
                    image: member.photo_url
                },
                ip_address: ip,
                login_time: session.created_at,
                last_active: lastActive,
                device_name: ua.device === 'Desktop' ? 'PC/Laptop' : ua.device,
                os_name: ua.os,
                os_version: '',
                browser: ua.browser,
                location: { country: 'Unknown' },
                is_current: false
            };
        });

        // Deduplicate by user_id - keep only the latest session per user
        const userSessionMap = new Map();
        processedSessions.forEach(session => {
            const existingSession = userSessionMap.get(session.user_id);
            if (!existingSession) {
                userSessionMap.set(session.user_id, session);
            } else {
                // Compare dates to keep the newer one
                const currentTime = new Date(session.last_active).getTime();
                const existingTime = new Date(existingSession.last_active).getTime();
                if (currentTime > existingTime) {
                    userSessionMap.set(session.user_id, session);
                }
            }
        });

        processedSessions = Array.from(userSessionMap.values());

        // Sort by last active desc
        processedSessions.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

        // Search Filter
        if (search) {
            const searchLower = search.toLowerCase();
            processedSessions = processedSessions.filter(s =>
                s.member.email?.toLowerCase().includes(searchLower) ||
                s.member.first_name?.toLowerCase().includes(searchLower) ||
                s.ip_address?.includes(search)
            );
        }

        const total = processedSessions.length;
        const pagedSessions = processedSessions.slice(offset, offset + limit);

        return NextResponse.json({
            sessions: pagedSessions,
            total,
            limit,
            offset
        });

    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.toString(),
            stack: error.stack
        }, { status: 500 });
    }
}

// DELETE endpoint to remove a session (force logout)
export async function DELETE(request) {
    try {
        const { sessionId } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        await prisma.$executeRaw`
            DELETE FROM auth.sessions WHERE id = ${sessionId}::uuid
        `;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
