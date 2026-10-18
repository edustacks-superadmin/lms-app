import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';
import { sendEmail } from '@/lib/emailHelper';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { orderId, paymentId, signature, dbOrderId } = body;

        if (!orderId || !paymentId || !signature) {
            return NextResponse.json(
                { success: false, error: 'Missing required payment details' },
                { status: 400 }
            );
        }

        // Use Prisma for easier data fetching
        const { default: prisma } = await import('../../../../lib/prisma');
        const { supabaseAdmin } = await import('../../../../lib/supabase');

        // Get Razorpay secret from database
        const instituteSettings = await prisma.institute_settings.findUnique({
            where: { id: 10 },
            select: { razorpay_key_secret: true }
        });

        if (!instituteSettings?.razorpay_key_secret) {
            return NextResponse.json(
                { success: false, error: 'Razorpay configuration not found' },
                { status: 500 }
            );
        }

        // Verify signature
        const text = orderId + '|' + paymentId;
        const generatedSignature = crypto
            .createHmac('sha256', instituteSettings.razorpay_key_secret)
            .update(text)
            .digest('hex');

        const isValid = generatedSignature === signature;

        if (isValid) {
            // Update ALL orders associated with this Razorpay Order ID
            const { data: updatedOrders, error: updateError } = await supabaseAdmin
                .from('orders')
                .update({
                    status: 'completed',
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                    payment_verified_at: new Date().toISOString()
                })
                .eq('razorpay_order_id', orderId)
                .select('*, products(*)');

            if (updateError) {
                console.error('Error updating orders:', updateError);
            }

            if (updatedOrders && updatedOrders.length > 0) {
                // Get member (using email from the first order)
                const { data: member } = await supabaseAdmin
                    .from('members')
                    .select('*')
                    .eq('email', updatedOrders[0].user_email)
                    .single();

                if (member) {
                    // Process each order for enrollment
                    const enrollmentPromises = updatedOrders.map(async (order) => {
                        // Find courses linked to this product
                        const { data: linkedCourses } = await supabaseAdmin
                            .from('courses')
                            .select('id')
                            .contains('allowed_products', [order.product_id]);

                        if (linkedCourses && linkedCourses.length > 0) {
                            const enrollmentData = linkedCourses.map(course => ({
                                student_id: member.id,
                                course_id: course.id,
                                status: 'active',
                                progress: 0,
                                enrolled_at: new Date().toISOString()
                            }));

                            const { error: enrollError } = await supabaseAdmin
                                .from('enrollments')
                                .insert(enrollmentData);

                            if (enrollError && enrollError.code !== '23505') {
                                console.error(`Enrollment error for product ${order.product_id}:`, enrollError);
                            }
                        }
                    });

                    await Promise.all(enrollmentPromises);

                    // --- Send Order Confirmation Email ---
                    try {
                        const productNames = updatedOrders.map(o => o.products?.title || 'Course').join(', ');
                        const totalAmount = updatedOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
                        const memberName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.display_name || 'Student';

                        await sendEmail({
                            to: member.email,
                            instituteId: 10,
                            templateName: 'Order Confirmation',
                            variables: {
                                '{{student_name}}': memberName,
                                '{{order_id}}': orderId,
                                '{{order_amount}}': totalAmount.toFixed(2),
                                '{{course_name}}': productNames,
                                '{{purchase_date}}': new Date().toLocaleDateString(),
                            },
                            subject: `Order Confirmation - ${orderId}`,
                            html: `<p>Thank you for your purchase of: <strong>${productNames}</strong>.</p><p>Total Paid: ₹${totalAmount.toFixed(2)}</p>`
                        });
                    } catch (emailErr) {
                        console.error('Email notification failed:', emailErr);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            verified: isValid
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
