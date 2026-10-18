-- Create a secure function to fetch leaderboard data
-- This bypasses RLS on exam_attempts to aggregate scores for all users
CREATE OR REPLACE FUNCTION get_leaderboard(time_filter text DEFAULT 'all')
RETURNS TABLE (
  user_id uuid,
  name text,
  photo_url text,
  total_score bigint,
  exams_taken bigint,
  rank bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      ea.user_id,
      SUM(ea.score) as total_score,
      COUNT(ea.id) as exams_taken
    FROM exam_attempts ea
    WHERE ea.status = 'completed'
    AND (
      time_filter = 'all' OR
      (time_filter = 'month' AND ea.created_at > now() - interval '1 month') OR
      (time_filter = 'week' AND ea.created_at > now() - interval '1 week')
    )
    GROUP BY ea.user_id
  )
  SELECT
    ru.user_id,
    coalesce(m.name, 'Student ' || substring(ru.user_id::text, 1, 4)) as name,
    m.photo_url,
    ru.total_score::bigint,
    ru.exams_taken::bigint,
    RANK() OVER (ORDER BY ru.total_score DESC)::bigint as rank
  FROM ranked_users ru
  LEFT JOIN members m ON ru.user_id = m.user_id
  ORDER BY ru.total_score DESC;
END;
$$;
