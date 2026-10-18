import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailHelper';

export async function POST(req) {
    try {
        const { email, first_name, last_name, institute_name, login_url } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        const fullName = [first_name, last_name].filter(Boolean).join(' ') || 'Student';

        const result = await sendEmail({
            to: email,
            instituteId: 10,
            templateName: 'Welcome Email',
            variables: {
                '{{student_name}}': fullName,
                '{{username}}': email,
                '{{email}}': email,
                '{{login_link}}': login_url || 'https://maheshiesacademy.edustacks.co.in/login',
                '{{institute_name}}': institute_name
            },
            // Fallbacks if template fails
            subject: `Welcome to ${institute_name || 'Edustacks'}!`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Welcome, ${first_name}!</h2>
                    <p>Thank you for registering. Your account has been created.</p>
                </div>
            `
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error sending welcome email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
