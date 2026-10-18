-- Add unique constraint to prevent duplicate applications for the same exam
ALTER TABLE public.exam_applications
ADD CONSTRAINT exam_applications_member_exam_unique UNIQUE (member_id, exam_tag);
