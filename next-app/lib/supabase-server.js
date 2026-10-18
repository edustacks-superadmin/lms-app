import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

export async function createClient() {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    // Create a Supabase client that forwards the Authorization header (if present)
    // This allows RLS to work and getUser() to validate the token
    const options = authHeader
        ? { global: { headers: { Authorization: authHeader } } }
        : {};

    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        options
    );
}
