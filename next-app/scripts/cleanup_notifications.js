const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupNotifications() {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // Older than 24 hours

    console.log(`Marking content older than ${cutoffDate.toISOString()} as notified...`);

    // Update content with available_from < cutoffDate OR available_from is NULL
    const { data, error } = await supabase
        .from('chapter_contents')
        .update({ notification_sent: true })
        .eq('notification_sent', false)
        .or(`available_from.lt.${cutoffDate.toISOString()},available_from.is.null`)
        .select();

    if (error) {
        console.error('Error updating content:', error);
    } else {
        console.log(`Successfully marked ${data.length} old items as notified.`);
    }
}

cleanupNotifications();
