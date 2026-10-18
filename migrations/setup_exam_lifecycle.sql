-- 1. Add Community & Verification Status to Members
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'community') THEN
        ALTER TABLE public.members ADD COLUMN community text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'verification_status') THEN
        ALTER TABLE public.members ADD COLUMN verification_status JSONB DEFAULT '{}';
        COMMENT ON COLUMN public.members.verification_status IS 'Stores verification status of fields: { "dob": true, "community": false, "photo": true }';
    END IF;
END $$;

-- 2. Create Exam Applications Table (The "History" & "Stage 1/2" Table)
CREATE TABLE IF NOT EXISTS public.exam_applications (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    member_id integer NOT NULL,
    exam_tag text NOT NULL, /* e.g., 'tnpsc_ae_2026' */
    
    /* Registration Data (Stage 1) */
    registration_number text,
    admit_card_url text,
    
    /* Result Data (Stage 2 - Verified by Admin/n8n) */
    verified_rank integer,
    verified_marks numeric(10,2),
    verified_community_rank integer,
    verified_post_selected text, /* e.g., 'Highways' */
    
    status text NOT NULL DEFAULT 'applied', /* applied, doc_uploaded, verified, rejected, result_declared */
    verification_note text,
    
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT exam_applications_pkey PRIMARY KEY (id),
    CONSTRAINT exam_applications_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE
);

/* 
   Note: Stage 3 (Achievers) uses existing 'external_exam_results' table.
   We will copy data from here to there when status becomes 'allotted'.
*/

-- RLS Policies
ALTER TABLE public.exam_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own applications" 
    ON public.exam_applications FOR SELECT 
    USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create applications" 
    ON public.exam_applications FOR INSERT 
    WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own applications" 
    ON public.exam_applications FOR UPDATE 
    USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
