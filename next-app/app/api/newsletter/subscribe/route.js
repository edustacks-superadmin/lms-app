import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        const { email, instituteId } = await request.json();

        if (!email || !instituteId) {
            return NextResponse.json(
                { error: 'Email and institute ID are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Check if already subscribed
        const existing = await prisma.newsletter_subscribers.findFirst({
            where: {
                email: email.toLowerCase(),
                institute_id: BigInt(instituteId)
            }
        });

        if (existing) {
            if (existing.is_active) {
                return NextResponse.json(
                    { error: 'You are already subscribed!' },
                    { status: 400 }
                );
            } else {
                // Reactivate subscription
                await prisma.newsletter_subscribers.update({
                    where: { id: existing.id },
                    data: { is_active: true, subscribed_at: new Date() }
                });
                return NextResponse.json({ success: true, message: 'Welcome back! You have been re-subscribed.' });
            }
        }

        // Create new subscription
        await prisma.newsletter_subscribers.create({
            data: {
                email: email.toLowerCase(),
                institute_id: BigInt(instituteId),
                is_active: true
            }
        });

        return NextResponse.json({ success: true, message: 'Successfully subscribed!' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe. Please try again.' },
            { status: 500 }
        );
    }
}
