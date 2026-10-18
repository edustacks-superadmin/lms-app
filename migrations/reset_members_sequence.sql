-- After importing users with explicit IDs, reset the sequence
-- Run this after user import is complete

-- Find the maximum ID in the members table and set the sequence to start after that
SELECT setval('members_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM members), false);

-- Verify the next value
SELECT nextval('members_id_seq') as next_id;
