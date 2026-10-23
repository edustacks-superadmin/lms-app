import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { batchId, memberIds, instituteId = 10, action } = body;

        // Support Force Logout for all users in a batch
        if (action === 'force-logout') {
            if (!batchId) {
                return res.status(400).json({ error: 'batchId is required' });
            }

            // 1. Fetch batch members
            const { data: batchMembers, error: bmError } = await supabaseAdmin
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', parseInt(batchId));

            if (bmError) throw bmError;
            if (!batchMembers || batchMembers.length === 0) {
                return res.status(200).json({ success: true, count: 0, message: 'No members in this batch' });
            }

            const mIds = batchMembers.map(m => m.member_id);

            // 2. Fetch members to get their auth_user_id and custom_data
            const { data: membersList, error: mError } = await supabaseAdmin
                .from('members')
                .select('id, auth_user_id, custom_data')
                .in('id', mIds);

            if (mError) throw mError;

            const allUserIds = [];
            (membersList || []).forEach(m => {
                if (m.auth_user_id) allUserIds.push(m.auth_user_id);
                if (m.id) allUserIds.push(String(m.id));
            });

            // 3. Delete from user_sessions (triggers Realtime logout on devices)
            if (allUserIds.length > 0) {
                await supabaseAdmin
                    .from('user_sessions')
                    .delete()
                    .in('user_id', allUserIds);
            }

            // 4. Clear active_sessions from members.custom_data
            for (const member of (membersList || [])) {
                const existingCustomData = member.custom_data || {};
                if (existingCustomData.active_sessions && existingCustomData.active_sessions.length > 0) {
                    await supabaseAdmin
                        .from('members')
                        .update({
                            custom_data: {
                                ...existingCustomData,
                                active_sessions: []
                            }
                        })
                        .eq('id', member.id);
                }
            }

            return res.status(200).json({
                success: true,
                count: mIds.length,
                message: `Force logout applied to ${mIds.length} user(s)`
            });
        }

        // Support DELETE method or POST with action='remove'
        if (req.method === 'DELETE' || action === 'remove') {
            if (!batchId || !memberIds || !Array.isArray(memberIds)) {
                return res.status(400).json({ error: 'batchId and array of memberIds are required' });
            }

            const { error } = await supabaseAdmin
                .from('batch_members')
                .delete()
                .eq('batch_id', parseInt(batchId))
                .in('member_id', memberIds.map(id => parseInt(id)));

            if (error) {
                console.error('[api/batch-members] Delete error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ success: true, message: 'Members removed from batch' });
        }

        // Support POST (Add members)
        if (req.method === 'POST') {
            if (!batchId || !memberIds || !Array.isArray(memberIds)) {
                return res.status(400).json({ error: 'batchId and array of memberIds are required' });
            }

            const parsedBatchId = parseInt(batchId);
            const inserts = memberIds.map(mId => ({
                batch_id: parsedBatchId,
                member_id: parseInt(mId),
                institute_id: parseInt(instituteId) || 10
            }));

            const { data, error } = await supabaseAdmin
                .from('batch_members')
                .upsert(inserts, { onConflict: 'batch_id,member_id' });

            if (error) {
                console.error('[api/batch-members] Insert error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({
                success: true,
                message: `Successfully added ${inserts.length} member(s) to batch`,
                count: inserts.length
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[api/batch-members] Unhandled error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
