-- Enable RLS
ALTER TABLE public.exam_applications ENABLE ROW LEVEL SECURITY;

-- 1. View Policy
DO $$ BEGIN
    CREATE POLICY "Users can view their own applications" 
    ON public.exam_applications FOR SELECT 
    USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create Policy
DO $$ BEGIN
    CREATE POLICY "Users can create applications" 
    ON public.exam_applications FOR INSERT 
    WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Update Policy
DO $$ BEGIN
    CREATE POLICY "Users can update their own applications" 
    ON public.exam_applications FOR UPDATE 
    USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
