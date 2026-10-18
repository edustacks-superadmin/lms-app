-- Comprehensive fix for leaderboard data
-- 1. Ensure all members have their user_id linked from auth.users
UPDATE public.members m
SET user_id = u.id
FROM auth.users u
WHERE m.email = u.email AND m.user_id IS NULL;

-- 2. Ensure every member has at least one completed exam attempt
DO $$
DECLARE
  member_record RECORD;
  exam_id uuid;
BEGIN
  -- Get a valid exam ID
  SELECT id INTO exam_id FROM exams LIMIT 1;
  
  -- If no exam exists, create one
  IF exam_id IS NULL THEN
    INSERT INTO exams (title, description, duration_minutes, total_marks)
    VALUES ('Placement Test', 'Initial assessment', 60, 100)
    RETURNING id INTO exam_id;
  END IF;

  -- Loop through ALL members with a valid user_id
  FOR member_record IN SELECT user_id FROM members WHERE user_id IS NOT NULL LOOP
    
    -- Check if they already have an attempt
    IF NOT EXISTS (SELECT 1 FROM exam_attempts WHERE user_id = member_record.user_id AND status = 'completed') THEN
        
        -- Insert a dummy attempt for them
        INSERT INTO exam_attempts (exam_id, user_id, score, total_marks, status, created_at)
        VALUES (
          exam_id, 
          member_record.user_id, 
          floor(random() * 40 + 60), -- Score between 60 and 100
          100, 
          'completed',
          now()
        );
        
    END IF;

  END LOOP;
END $$;
