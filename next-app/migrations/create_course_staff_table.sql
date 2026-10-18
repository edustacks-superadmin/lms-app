-- Create course_staff table for assigning staff/mentors to courses
-- Run this migration in your Supabase SQL Editor

-- Create the course_staff table
CREATE TABLE IF NOT EXISTS public.course_staff (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff', -- 'mentor', 'staff', 'content_manager', 'assistant'
    permissions JSONB DEFAULT '{}', -- Optional: granular permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    institute_id BIGINT DEFAULT 10,
    
    -- Ensure a member can only be assigned once per course
    UNIQUE(course_id, member_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_staff_course_id ON public.course_staff(course_id);
CREATE INDEX IF NOT EXISTS idx_course_staff_member_id ON public.course_staff(member_id);
CREATE INDEX IF NOT EXISTS idx_course_staff_institute_id ON public.course_staff(institute_id);

-- Enable RLS
ALTER TABLE public.course_staff ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE public.course_staff IS 'Stores staff/mentor assignments to courses';
COMMENT ON COLUMN public.course_staff.role IS 'Role of the staff member for this course: mentor, staff, content_manager, assistant';
COMMENT ON COLUMN public.course_staff.permissions IS 'Optional JSON object for granular permissions like {can_edit_content: true, can_view_analytics: true}';
