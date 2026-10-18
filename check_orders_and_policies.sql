-- check_orders_and_policies.sql

-- 1. Check the last 10 orders
select * from orders order by created_at desc limit 10;

-- 2. Check RLS policies on orders
select * from pg_policies where tablename = 'orders';

-- 3. Check if RLS is enabled on orders
select relname, relrowsecurity from pg_class where relname = 'orders';
