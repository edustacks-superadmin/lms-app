import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailHelper';

/**
 * Send order/enrollment confirmation email
 * Used by mobile app for free enrollments and general order confirmations
 */
export async function POST(req) {
    try {
        const {
            email,
            student_name,
            course_name,
            order_id,
            order_amount,
            is_free = false
        } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        const subject = is_free
            ? `You've been enrolled in ${course_name}!`
            : `Order Confirmation #${order_id}`;

        const result = await sendEmail({
            to: email,
            instituteId: 10,
            templateName: 'Order Confirmation',
            variables: {
                '{{student_name}}': student_name || 'Student',
                '{{order_id}}': order_id || 'N/A',
                '{{order_amount}}': is_free ? 'Free' : `₹${order_amount}`,
                '{{course_name}}': course_name || 'Course',
                '{{purchase_date}}': new Date().toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
            },
            // Fallback if template not found
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563EB;">🎉 ${is_free ? 'Enrollment Confirmed!' : 'Order Confirmed!'}</h2>
                    <p>Hi ${student_name || 'Student'},</p>
                    <p>${is_free
                    ? `You have been successfully enrolled in <strong>${course_name}</strong>.`
                    : `Thank you for your order. Your payment of <strong>₹${order_amount}</strong> has been received.`
                }</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Course:</strong> ${course_name}</p>
                        ${!is_free ? `<p style="margin: 10px 0 0;"><strong>Order ID:</strong> ${order_id}</p>` : ''}
                        <p style="margin: 10px 0 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                    <p>You can now access your course from the "My Courses" section.</p>
                    <p>Happy Learning!</p>
                </div>
            `
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error sending order confirmation email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
