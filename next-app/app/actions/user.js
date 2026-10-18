'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkUsersByEmail(emails) {
    try {
        if (!emails || emails.length === 0) {
            return { success: true, foundUsers: [], notFoundEmails: [] };
        }

        // Convert all input emails to lowercase for case-insensitive matching logic
        const normalizedEmails = emails.map(e => e.toLowerCase().trim());

        // Fetch users with matching emails
        const foundUsers = await prisma.members.findMany({
            where: {
                email: {
                    in: normalizedEmails,
                    mode: 'insensitive' // Ensure case-insensitive DB match
                }
            },
            select: {
                id: true,
                email: true,
                display_name: true,
                username: true
            }
        });

        // Identify which emails were not found
        const foundEmailSet = new Set(foundUsers.map(u => u.email.toLowerCase()));

        // Check against the original list (normalized) to find missing ones
        const notFoundEmails = normalizedEmails.filter(email => !foundEmailSet.has(email));

        // Map found users to a standardized format if needed, or return as is
        const users = foundUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.display_name || u.username || 'User'
        }));

        return {
            success: true,
            foundUsers: users,
            notFoundEmails
        };

    } catch (error) {
        console.error('Error validation users by email:', error);
        return { success: false, error: 'Failed to validate users' };
    } finally {
        await prisma.$disconnect();
    }
}

// Session management placeholders
// Session management implementation
export async function getUserSessions(userId) {
    try {
        if (!userId) return { success: false, error: 'User ID is required' };

        // Query auth.sessions table directly
        // Note: This requires the database user to have permissions on auth schema
        const sessions = await prisma.$queryRaw`
            SELECT id, user_id, created_at, updated_at, ip, user_agent 
            FROM auth.sessions 
            WHERE user_id = ${userId}::uuid 
            ORDER BY updated_at DESC
        `;

        return { success: true, data: sessions };
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return { success: false, error: 'Failed to fetch active sessions' };
    }
}

export async function revokeSession(sessionId) {
    try {
        if (!sessionId) return { success: false, error: 'Session ID is required' };

        await prisma.$executeRaw`
            DELETE FROM auth.sessions WHERE id = ${sessionId}::uuid
        `;
        return { success: true };
    } catch (error) {
        console.error('Error revoking session:', error);
        return { success: false, error: 'Failed to revoke session' };
    }
}

export async function revokeAllSessions(userId) {
    try {
        if (!userId) return { success: false, error: 'User ID is required' };

        await prisma.$executeRaw`
            DELETE FROM auth.sessions WHERE user_id = ${userId}::uuid
        `;
        return { success: true };
    } catch (error) {
        console.error('Error revoking all sessions:', error);
        return { success: false, error: 'Failed to revoke all sessions' };
    }
}
