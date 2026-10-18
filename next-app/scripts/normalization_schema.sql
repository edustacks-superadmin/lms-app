-- Create exam_posts table to store post definitions per notification
CREATE TABLE IF NOT EXISTS public.exam_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id BIGINT REFERENCES public.exam_configurations(id) ON DELETE CASCADE,
    post_code TEXT NOT NULL,
    post_name TEXT NOT NULL,
    dept TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(config_id, post_code)
);

-- Create post_vacancies table for granular seat tracking
CREATE TABLE IF NOT EXISTS public.post_vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.exam_posts(id) ON DELETE CASCADE,
    community TEXT NOT NULL, -- 'GT', 'BC', 'MBC/DC', 'BCM', 'SC', 'SCA', 'ST'
    gender TEXT NOT NULL,    -- 'General', 'Women'
    is_pstm BOOLEAN DEFAULT false,
    special_category TEXT,   -- 'Low Vision', 'Hard of Hearing', 'Ex-Servicemen', etc.
    vacancy_type TEXT DEFAULT 'Regular', -- 'Regular', 'Backlog'
    seat_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_exam_posts_config_id ON public.exam_posts(config_id);
CREATE INDEX IF NOT EXISTS idx_post_vacancies_post_id ON public.post_vacancies(post_id);
CREATE INDEX IF NOT EXISTS idx_post_vacancies_community ON public.post_vacancies(community);

-- Enable RLS (Row Level Security) - though usually admin handles this
ALTER TABLE public.exam_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_vacancies ENABLE ROW LEVEL SECURITY;

-- Simple policy for admin access (replace with your specific admin role/logic)
CREATE POLICY "Allow all access to admins" ON public.exam_posts FOR ALL USING (true);
CREATE POLICY "Allow all access to admins" ON public.post_vacancies FOR ALL USING (true);
