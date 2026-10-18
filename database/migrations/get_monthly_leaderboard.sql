-- Function to get the monthly leaderboard based on the sum of BEST scores per exam
-- This handles the "scale" issue by performing aggregation in the database.

create or replace function get_monthly_leaderboard()
returns table (
  member_id bigint,
  name text,
  total_score bigint,
  rank bigint
) 
language plpgsql
as $$
declare
  start_of_month timestamp;
begin
  -- Calculate start of current month
  start_of_month := date_trunc('month', now());

  return query
  with best_attempts as (
    -- Get the MAX score for each user per exam for this month
    select 
      ea.member_id,
      ea.exam_id,
      MAX(ea.score) as max_score
    from exam_attempts ea
    where ea.submitted_at >= start_of_month
    group by ea.member_id, ea.exam_id
  ),
  user_totals as (
    -- Sum the max scores to get total points
    select 
      ba.member_id,
      SUM(ba.max_score) as total_score
    from best_attempts ba
    group by ba.member_id
  )
  select 
    ut.member_id,
    COALESCE(m.first_name || ' ' || m.last_name, 'Unknown User') as name,
    ut.total_score::bigint,
    RANK() OVER (ORDER BY ut.total_score DESC)::bigint as rank
  from user_totals ut
  join members m on m.id = ut.member_id
  order by ut.total_score desc
  limit 50;
end;
$$;
