
-- Function to get exam leaderboard with stats
CREATE OR REPLACE FUNCTION public.get_exam_leaderboard(_exam_id INT)
RETURNS TABLE (
    attempt_id INT,
    member_id INT,
    member_name TEXT,
    member_photo TEXT,
    score NUMERIC,
    total_marks NUMERIC,
    percentage NUMERIC,
    duration_seconds INT,
    answered_count BIGINT,
    correct_count BIGINT,
    incorrect_count BIGINT,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ea.id AS attempt_id,
    m.id AS member_id,
    COALESCE(m.display_name, 'Anonymous') AS member_name,
    m.photo_url AS member_photo,
    ea.score,
    ea.total_marks,
    CASE 
        WHEN ea.total_marks > 0 THEN (ea.score / ea.total_marks) * 100 
        ELSE 0 
    END AS percentage,
    EXTRACT(EPOCH FROM (ea.submitted_at - ea.started_at))::INT AS duration_seconds,
    
    -- Stats from exam_answers (if available)
    (SELECT COUNT(*) FROM exam_answers ans WHERE ans.attempt_id = ea.id) AS answered_count,
    (SELECT COUNT(*) FROM exam_answers ans WHERE ans.attempt_id = ea.id AND ans.is_correct = true) AS correct_count,
    (SELECT COUNT(*) FROM exam_answers ans WHERE ans.attempt_id = ea.id AND ans.is_correct = false) AS incorrect_count,
    
    ea.started_at,
    ea.submitted_at,
    ea.status
  FROM exam_attempts ea
  JOIN members m ON ea.member_id = m.id
  WHERE ea.exam_id = _exam_id
  AND ea.status IN ('submitted', 'completed')
  ORDER BY ea.score DESC, duration_seconds ASC;
$$;
