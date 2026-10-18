-- Function to get the leaderboard with flexible filtering and limiting
-- Added photo_url to return columns

DROP FUNCTION IF EXISTS get_leaderboard(text);
DROP FUNCTION IF EXISTS get_leaderboard(text, int);

create or replace function get_leaderboard(p_time_filter text default 'month', p_limit int default 50)
returns table (
  member_id bigint,
  name text,
  photo_url text,
  total_score bigint,
  rank bigint
) 
language plpgsql
security definer
as $$
declare
  start_date timestamp;
begin
  -- Calculate start date based on filter
  if p_time_filter = 'month' then
    start_date := date_trunc('month', now());
  else
    -- For 'all_time', use a very old date
    start_date := '2000-01-01'; 
  end if;

  return query
  with best_attempts as (
    -- Get the MAX score for each user per exam since start_date
    select 
      ea.member_id,
      ea.exam_id,
      MAX(ea.score) as max_score
    from exam_attempts ea
    where ea.submitted_at >= start_date
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
    ut.member_id::bigint, 
    COALESCE(m.first_name || ' ' || m.last_name, 'Unknown User') as name,
    m.photo_url, -- return photo_url from members table
    ut.total_score::bigint,
    RANK() OVER (ORDER BY ut.total_score DESC)::bigint as rank
  from user_totals ut
  join members m on m.id = ut.member_id
  order by ut.total_score desc
  limit p_limit;
end;
$$;
