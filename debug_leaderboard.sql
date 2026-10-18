-- Diagnostic script to check leaderboard data

-- 1. Count total exam attempts
SELECT count(*) as total_attempts FROM exam_attempts;

-- 2. Count completed exam attempts
SELECT count(*) as completed_attempts FROM exam_attempts WHERE status = 'completed';

-- 3. Count completed exam attempts (case insensitive)
SELECT count(*) as completed_attempts_ci FROM exam_attempts WHERE lower(status) = 'completed';

-- 4. Check if there are any members with user_id
SELECT count(*) as members_with_userid FROM members WHERE user_id IS NOT NULL;

-- 5. Try to run the function directly (simulated)
SELECT * FROM get_leaderboard('all');

-- 6. Check recent attempts
SELECT id, user_id, score, status, created_at FROM exam_attempts ORDER BY created_at DESC LIMIT 5;
