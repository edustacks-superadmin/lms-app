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
