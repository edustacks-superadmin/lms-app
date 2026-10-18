-- Change user_id from INTEGER to UUID
ALTER TABLE subscriptions 
ALTER COLUMN user_id TYPE UUID USING NULL::uuid;

-- Add Foreign Key constraint to auth.users if it doesn't exist
-- We first try to drop it just in case
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
