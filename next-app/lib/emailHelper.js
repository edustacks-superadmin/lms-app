import nodemailer from 'nodemailer';
import { supabase, supabaseAdmin } from './supabase';

/**
 * Sends an email using the institute's configured SMTP settings.
 * optionally supports templates.
 * 
 * @param {string} to - Recipient email
 * @param {string} subject - Fallback subject (if no template)
 * @param {string} html - Fallback HTML body (if no template)
 * @param {string} templateName - Optional: Name of the template to use (e.g. "Welcome Email")
 * @param {object} variables - Variables to substitute in the template
 */
export async function sendEmail({ to, subject, html, templateName, variables = {}, instituteId }) {
    try {
        // 1. Fetch SMTP Settings
        let query = supabase
            .from('institute_settings')
            .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, gmail_app_credentials, name');

        if (instituteId) {
            query = query.eq('id', instituteId);
        }

        const { data: settings, error: settingsError } = await query
            .limit(1)
            .single();

        if (settingsError || !settings) {
            console.error("Failed to fetch SMTP settings:", settingsError);
            throw new Error('SMTP settings not found');
        }

        const { smtp_host, smtp_port, smtp_user: legacyUser, smtp_password: legacyPassword, smtp_from_email, gmail_app_credentials, name: dbInstituteName } = settings;

        const smtpUser = gmail_app_credentials?.smtp_user || legacyUser;
        const smtpPassword = gmail_app_credentials?.smtp_password || legacyPassword;

        if (!smtpUser || !smtpPassword) {
            throw new Error('SMTP credentials not configured');
        }

        let finalSubject = subject;
        let finalHtml = html;

        // 2. Handle Template
        if (templateName) {
            const { data: templates } = await supabaseAdmin
                .from('email_templates')
                .select('*')
                .ilike('name', templateName)
                .eq('is_active', true)
                .limit(1);

            if (templates && templates.length > 0) {
                const template = templates[0];
                finalSubject = template.subject;
                finalHtml = template.body;

                // Add default variables
                const allVariables = {
                    '{{institute_name}}': dbInstituteName || 'Edustacks',
                    ...variables
                };

                // Variable Substitution
                Object.keys(allVariables).forEach(key => {
                    const regex = new RegExp(key, 'g');
                    finalSubject = finalSubject.replace(regex, allVariables[key]);
                    finalHtml = finalHtml.replace(regex, allVariables[key]);
                });
            } else {
                console.warn(`Template '${templateName}' not found. Using fallback content.`);
            }
        }

        // 3. Configure Transporter
        const transporter = nodemailer.createTransport({
            host: smtp_host || 'smtp.gmail.com',
            port: smtp_port || 465,
            secure: (smtp_port || 465) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        });

        // 4. Send Email
        const info = await transporter.sendMail({
            from: smtp_from_email || smtpUser,
            to,
            subject: finalSubject,
            html: finalHtml,
        });

        console.log(`Email sent to ${to} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}
