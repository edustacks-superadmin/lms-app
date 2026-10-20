import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    // Enable full CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, mode } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Content ID is required' });
    }

    try {
        const contentId = parseInt(id, 10);
        if (isNaN(contentId)) {
            return res.status(400).json({ error: 'Invalid content ID' });
        }

        // Fetch URL from Supabase
        const { data: content, error: dbError } = await supabase
            .from('chapter_contents')
            .select('id, url, title')
            .eq('id', contentId)
            .single();

        if (dbError || !content) {
            console.error(`[proxy-pdf] Database query failed for ID ${id}:`, dbError);
            return res.status(404).json({ error: `PDF content not found for ID ${id}` });
        }

        if (!content.url) {
            return res.status(404).json({ error: 'No PDF URL associated with this content' });
        }

        // Direct 302 redirect if requested
        if (mode === 'redirect') {
            return res.redirect(302, content.url);
        }

        // Fetch the file from source (Supabase Storage or Cloudflare R2)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

        const upstreamResponse = await fetch(content.url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EdustacksProxy/1.0)'
            }
        });

        clearTimeout(timeout);

        if (!upstreamResponse.ok) {
            console.error(`[proxy-pdf] Upstream fetch failed (${upstreamResponse.status}) for ${content.url}`);
            return res.redirect(302, content.url);
        }

        const contentLength = upstreamResponse.headers.get('content-length');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Content-Title', encodeURIComponent(content.title || ''));
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        if (req.method === 'HEAD') {
            return res.status(200).end();
        }

        // Stream PDF body to response
        const nodeStream = Readable.fromWeb(upstreamResponse.body);
        nodeStream.on('data', (chunk) => res.write(chunk));
        nodeStream.on('end', () => res.end());
        nodeStream.on('error', (streamErr) => {
            console.error(`[proxy-pdf] Stream error for ID ${id}:`, streamErr);
            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.end();
            }
        });
    } catch (error) {
        console.error(`[proxy-pdf] Unexpected error for ID ${id}:`, error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to proxy PDF', details: error.message });
        }
    }
}
