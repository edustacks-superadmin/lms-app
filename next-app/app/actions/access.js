'use server';

import prisma from '@/lib/prisma';

/**
 * Checks if a user has active access to a batch.
 * Verifies both:
 * 1. Existence in `batch_members`
 * 2. Active status and Expiry date in `subscriptions` (if applicable)
 * 
 * @param {string|number} userId - The user's ID (or Member ID, depending on your auth model. Assuming Member ID here matching batch_members)
 * @param {string|number} batchId - The batch ID
 * @returns {Promise<{ hasAccess: boolean, reason?: string }>}
 */
export async function checkBatchAccess(memberId, batchId) {
    try {
        const mId = parseInt(memberId);
        const bId = parseInt(batchId);

        // 1. Check basic membership
        const memberRecord = await prisma.batch_members.findFirst({
            where: {
                batch_id: bId,
                member_id: mId
            }
        });

        if (!memberRecord) {
            return { hasAccess: false, reason: 'User is not a member of this batch.' };
        }

        // 2. Check subscription status (Expiry)
        // A user might be in `batch_members` (legacy) but not have a subscription (manual add).
        // If your policy is "Subscriptions dictate expiry", we check for one.
        // If no subscription exists, we assume "Lifetime" (legacy behavior) OR "No Access" (strict).
        // Based on user request "user can have batch expiry date via subscriptions", 
        // implies subscription acts as the limiter.

        const subscription = await prisma.subscriptions.findFirst({
            where: {
                member_id: mId,
                batch_id: bId,
                status: 'Active'
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Strict Check: If subscription exists, check expiry.
        if (subscription) {
            if (subscription.expires_on && new Date(subscription.expires_on) < new Date()) {
                return { hasAccess: false, reason: 'Batch subscription has expired.' };
            }
        } else {
            // Optional: stricter policy?
            // return { hasAccess: false, reason: 'No active subscription found.' };
        }

        return { hasAccess: true };

    } catch (error) {
        console.error('CheckBatchAccess Error:', error);
        return { hasAccess: false, reason: 'System error checking access.' };
    }
}
