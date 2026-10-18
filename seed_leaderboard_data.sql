-- Seed dummy exam attempts to verify leaderboard
-- This script finds existing members and adds completed exam attempts for them

DO $$
DECLARE
  member_record RECORD;
  exam_id uuid;
BEGIN
  -- 1. Get a valid exam ID (or create a dummy one if none exist)
  SELECT id INTO exam_id FROM exams LIMIT 1;
  
  IF exam_id IS NULL THEN
    INSERT INTO exams (title, description, duration_minutes, total_marks)
    VALUES ('Dummy Exam', 'For leaderboard testing', 60, 100)
    RETURNING id INTO exam_id;
  END IF;

  -- 2. Loop through members with user_id and add attempts
  FOR member_record IN SELECT user_id FROM members WHERE user_id IS NOT NULL LIMIT 5 LOOP
    
    -- Insert attempt 1
    INSERT INTO exam_attempts (exam_id, user_id, score, total_marks, status, created_at)
    VALUES (
      exam_id, 
      member_record.user_id, 
      floor(random() * 50 + 50), -- Random score between 50 and 100
      100, 
      'completed',
      now() - (random() * interval '10 days') -- Random date in last 10 days
    );

    -- Insert attempt 2 (some users take multiple)
    IF random() > 0.5 THEN
        INSERT INTO exam_attempts (exam_id, user_id, score, total_marks, status, created_at)
        VALUES (
          exam_id, 
          member_record.user_id, 
          floor(random() * 50 + 50), 
          100, 
          'completed',
          now() - (random() * interval '10 days')
        );
    END IF;

  END LOOP;
END $$;
