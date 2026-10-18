const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Verifying Institute Settings Schema...");

    try {
        // Query to check if the new columns exist
        // We use raw query because the Prisma Client might not be regenerated yet
        const result = await prisma.$queryRaw`
            SELECT 
                column_name, 
                data_type 
            FROM 
                information_schema.columns 
            WHERE 
                table_name = 'institute_settings' 
                AND column_name IN (
                    'enable_single_device_login', 
                    'allowed_ips', 
                    'max_login_attempts', 
                    'login_cooldown_minutes', 
                    'session_timeout_minutes', 
                    'logout_at_browser_close',
                    'allow_pdf_download',
                    'allow_video_download',
                    'max_video_downloads',
                    'enable_pdf_watermark',
                    'pdf_watermark_image_url',
                    'enable_video_watermark',
                    'video_watermark_position',
                    'allow_student_registration',
                    'verification_method',
                    'allow_google_login',
                    'allow_facebook_login',
                    'login_access_code',
                    'label_dashboard',
                    'label_leaderboard',
                    'label_helpdesk',
                    'label_bookmarks',
                    'label_username',
                    'label_password',
                    'msg_empty_course',
                    'custom_header_html',
                    'webhook_order_success',
                    'webhook_exam_result',
                    'android_app_hash_key',
                    'disable_student_analytics',
                    'hide_leaderboard_names',
                    'enable_comments',
                    'comment_moderation',
                    'notify_admin_on_comment',
                    'blocked_comment_words',
                    'enforce_user_photo',
                    'allow_user_profile_edit',
                    'disable_forgot_password'
                );
        `;

        console.log("Found Columns:", result.length);
        result.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        if (result.length >= 38) {
            console.log("SUCCESS: All 38 expected columns are present in the database.");
        } else {
            console.error("FAILURE: Missing columns. Found only " + result.length + "/38.");
            process.exit(1);
        }

        // Optional: specific data check
        const data = await prisma.$queryRaw`SELECT id, enable_single_device_login, allow_pdf_download FROM institute_settings LIMIT 1`;
        console.log("Sample Data Row:", data);

    } catch (e) {
        console.error("Verification Failed:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
