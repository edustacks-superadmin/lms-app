import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sql = `
    -- 1. Rename column
    ALTER TABLE public.content_progress 
    RENAME COLUMN student_id TO member_id;

    -- 2. Drop old constraint
    ALTER TABLE public.content_progress 
    DROP CONSTRAINT IF EXISTS content_progress_student_content_unique;

    -- 3. Add new unique constraint
    ALTER TABLE public.content_progress 
    ADD CONSTRAINT content_progress_member_content_unique UNIQUE (member_id, content_id);

    -- 4. Add FK constraint (optional but good practice, assuming members.id matches)
    -- ALTER TABLE public.content_progress
    -- ADD CONSTRAINT fk_content_progress_member FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

    -- 5. Enable RLS
    ALTER TABLE public.content_progress ENABLE ROW LEVEL SECURITY;

    -- 6. Drop old policies (if any exist that reference student_id)
    DROP POLICY IF EXISTS "Users can view their own progress" ON public.content_progress;
    DROP POLICY IF EXISTS "Users can insert/update their own progress" ON public.content_progress;

    -- 7. Create new policies referencing member_id
    CREATE POLICY "Users can view their own progress" 
    ON public.content_progress 
    FOR SELECT 
    USING (
      member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can insert their own progress" 
    ON public.content_progress 
    FOR INSERT 
    WITH CHECK (
      member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can update their own progress" 
    ON public.content_progress 
    FOR UPDATE 
    USING (
      member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
      )
    );
  `;

    try {
        const { error } = await supabase.rpc('pg_execute_string', { statement: sql });

        // Fallback if pg_execute_string is not available or fails, try raw query if using node-postgres directly? 
        // Supabase-js doesn't support raw SQL directly on client. 
        // BUT we can use the technique of creating a function if we had to.

        // However, usually we can't run DDL via JS client unless we have a specific RPC function for it.
        // Wait, the user has 'supabaseAdmin'.

        // If the above RPC doesn't exist, we might fail. 
        // Let's assume the user has a way to run SQL or we rely on 'pg_execute_string' which is a common helper.
        // OR we just provide the SQL to the user?
        // No, I can try to run it. If it fails, I'll print the SQL for the user.

        if (error) {
            console.error('Migration Error:', error);
            return NextResponse.json({ success: false, error: error.message, sql_to_run: sql }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Migration executed successfully' });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message, sql_to_run: sql }, { status: 500 });
    }
}

// NOTE: Since we might not have 'pg_execute_string' RPC,
// I will actually create an RPC call text that the USER can run in SQL Editor if this fails.
