'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function recordCashPayment(data) {
    try {
        const {
            productId,
            memberId,
            amount,
            notes,
            productName,
            userEmail,
            userId, // Auth user ID if available, else null
            instituteId = 10 // Default to 10 as per schema defaults
        } = data;

        // 1. Create order record
        const order = await prisma.orders.create({
            data: {
                product_id: parseInt(productId),
                member_id: parseInt(memberId),
                amount: parseFloat(amount),
                status: 'completed', // Standardized status
                payment_method: 'cash',
                payment_verified_at: new Date(),
                user_id: userId || null,
                user_email: userEmail,
                payment_notes: notes,
                institute_id: BigInt(instituteId) // Ensure BigInt for institute_id
            }
        });

        // Convert BigInt to string for serialization if needed, though server actions usually handle JSON.
        // Prisma return object might have BigInts which nextjs server actions can't serialize to client directly?
        // We usually need to map it or utilize a helper. 
        // Let's return a simple success response to avoid serialization issues with the full order object if it contains BigInts.

        revalidatePath(`/store/product/${productId}`);
        revalidatePath('/store');

        return { success: true, data: { id: order.id } };
    } catch (error) {
        console.error('Error recording cash payment:', error);
        return { success: false, error: error.message };
    }
}
