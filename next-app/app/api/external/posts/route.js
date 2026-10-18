import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
        }

        // 1. Find Institute by API Key in DB
        const { data: institute, error: instError } = await supabaseAdmin
            .from('institute_settings')
            .select('id')
            .eq('internal_api_key', apiKey)
            .single();

        // 2. Fallback to Master Key (from .env) for migration/admin use
        const isMasterKey = process.env.INTERNAL_API_KEY && apiKey === process.env.INTERNAL_API_KEY;

        if (instError && !isMasterKey) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        const {
            title,
            content,
            summary,
            cover_image,
            category_id,
            access_control,
            publication_date,
            allowed_products,
            // Default to found institute ID, or provided ID if master key is used
            institute_id = institute?.id || 10
        } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        // Generate slug
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        const uniqueSuffix = Date.now().toString(36).slice(-4);
        const slug = `${baseSlug}-${uniqueSuffix}`;

        const { data: post, error } = await supabaseAdmin
            .from('posts')
            .insert([
                {
                    title,
                    slug,
                    content,
                    summary: summary || title.substring(0, 160),
                    description: summary || title.substring(0, 160),
                    cover_image,
                    category_id,
                    access_control: access_control || 'Public',
                    publication_date: publication_date || new Date().toISOString(),
                    allowed_products: allowed_products || [],
                    institute_id,
                    icon: '🤖' // n8n automation icon
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error('External Post API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
