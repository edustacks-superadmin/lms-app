import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
    try {
        const { to, subject, html, text } = await req.json();

        // 1. Fetch SMTP Settings from Database
        // We assume the first record in 'institute_settings' is the active one, or filter by host/subdomain if needed.
        // For now, fetching the first available setting.
        const { data: settings, error: settingsError } = await supabase
            .from('institute_settings')
            .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, gmail_app_credentials')
            .limit(1)
            .single();

        if (settingsError || !settings) {
            console.error("Failed to fetch SMTP settings:", settingsError);
            return NextResponse.json({ success: false, error: 'SMTP settings not found' }, { status: 500 });
        }

        const { smtp_host, smtp_port, smtp_user: legacyUser, smtp_password: legacyPassword, smtp_from_email, gmail_app_credentials } = settings;

        const smtpUser = gmail_app_credentials?.smtp_user || legacyUser;
        const smtpPassword = gmail_app_credentials?.smtp_password || legacyPassword;

        if (!smtpUser || !smtpPassword) {
            return NextResponse.json({ success: false, error: 'SMTP credentials not configured' }, { status: 400 });
        }

        // 2. Configure Transporter
        const transporter = nodemailer.createTransport({
            host: smtp_host || 'smtp.gmail.com',
            port: smtp_port || 465,
            secure: (smtp_port || 465) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        });

        // 3. Send Email
        const info = await transporter.sendMail({
            from: smtp_from_email || smtpUser, // Use configured from_email or fallback to user
            to,
            subject,
            text,
            html,
        });

        console.log("Email sent:", info.messageId);
        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error("Error sending email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
