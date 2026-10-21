import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, origin } = req.body || {};

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Valid email address is required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const siteOrigin = origin || 'https://maheshiesacademy.edustacks.co.in';
        const redirectUrl = `${siteOrigin}/reset-password`;

        // 1. Check if user exists in auth.users or members
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id, first_name, last_name, email, institute_id')
            .eq('email', cleanEmail)
            .maybeSingle();

        // 2. Generate the recovery link
        let actionLink = null;
        let recoveryRes = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: cleanEmail,
            options: {
                redirectTo: redirectUrl
            }
        });

        // If user not in auth.users yet (e.g. migrated member), create the user in auth.users first
        if (recoveryRes.error && recoveryRes.error.message?.includes('User not found') && member) {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                email_confirm: true,
                user_metadata: {
                    first_name: member.first_name || '',
                    last_name: member.last_name || '',
                    role: 'student'
                }
            });

            if (!createError && newUser?.user) {
                recoveryRes = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: cleanEmail,
                    options: {
                        redirectTo: redirectUrl
                    }
                });
            }
        }

        if (recoveryRes.error) {
            console.error('generateLink error:', recoveryRes.error);
            return res.status(400).json({
                error: recoveryRes.error.message || 'Could not generate reset link. Please check if this email is registered.'
            });
        }

        actionLink = recoveryRes.data?.properties?.action_link;
        if (!actionLink) {
            return res.status(500).json({ error: 'Failed to generate password recovery link' });
        }

        // 3. Fetch Institute Details for Branding
        let instituteName = 'Mahesh IES Academy';
        let instituteLogo = null;
        let instituteSmtp = null;

        try {
            const { data: settings } = await supabaseAdmin
                .from('institute_settings')
                .select('*')
                .limit(5);

            if (settings && settings.length > 0) {
                // Find matching institute or default
                const inst = settings.find(s => s.id === (member?.institute_id || 10)) || settings[0];
                instituteName = inst.name || instituteName;
                instituteLogo = inst.logo_url;
                instituteSmtp = inst;
            }
        } catch (e) {
            console.warn('Failed to fetch institute settings:', e.message);
        }

        // 4. Configure Email Transporter
        // Primary: institute's own credentials; Fallback: active verified credentials
        const creds = [
            {
                user: instituteSmtp?.gmail_app_credentials?.smtp_user || instituteSmtp?.smtp_user,
                pass: instituteSmtp?.gmail_app_credentials?.smtp_password || instituteSmtp?.smtp_password,
                from: `${instituteName} <${instituteSmtp?.gmail_app_credentials?.smtp_user || 'maheshiesacademy@gmail.com'}>`
            },
            {
                user: 'maheshmedicoacademy@gmail.com',
                pass: 'gksq hzep boar tcln',
                from: `${instituteName} <maheshmedicoacademy@gmail.com>`
            }
        ].filter(c => c.user && c.pass);

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
    <div style="background-color: #1e3a8a; padding: 24px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">${instituteName}</h1>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="margin-top: 0; font-size: 18px; color: #111827;">Reset Your Password</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        Hello${member?.first_name ? ' ' + member.first_name : ''},<br><br>
        We received a request to reset the password for your account (<strong>${cleanEmail}</strong>). Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you did not make this request, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; word-break: break-all; margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${actionLink}" style="color: #2563eb;">${actionLink}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

        let sent = false;
        let lastError = null;

        for (const cred of creds) {
            try {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: cred.user,
                        pass: cred.pass
                    }
                });

                await transporter.sendMail({
                    from: cred.from,
                    to: cleanEmail,
                    subject: `Reset Your Password - ${instituteName}`,
                    html: emailHtml
                });

                sent = true;
                break;
            } catch (err) {
                console.warn(`SMTP send attempt failed with ${cred.user}:`, err.message);
                lastError = err;
            }
        }

        if (!sent) {
            console.error('All SMTP send attempts failed:', lastError);
            return res.status(500).json({
                error: 'Failed to send recovery email. Please contact academy support.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email.'
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
