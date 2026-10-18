-- Fix UUID/Integer mismatches for Course & Batch relations
-- These tables use UUIDs for columns that should reference Integer IDs.

-- 1. Fix batch_courses
-- batch_id (UUID -> Integer), course_id (UUID -> Integer)
ALTER TABLE batch_courses DROP CONSTRAINT IF EXISTS batch_courses_pkey;
ALTER TABLE batch_courses DROP COLUMN IF EXISTS batch_id;
ALTER TABLE batch_courses DROP COLUMN IF EXISTS course_id;

ALTER TABLE batch_courses ADD COLUMN batch_id integer REFERENCES batches(id);
ALTER TABLE batch_courses ADD COLUMN course_id integer REFERENCES courses(id);
ALTER TABLE batch_courses ADD PRIMARY KEY (batch_id, course_id);

-- 2. Fix post_batches
-- post_id (UUID -> Integer), batch_id (UUID -> Integer)
ALTER TABLE post_batches DROP CONSTRAINT IF EXISTS post_batches_pkey;
ALTER TABLE post_batches DROP COLUMN IF EXISTS post_id;
ALTER TABLE post_batches DROP COLUMN IF EXISTS batch_id;

ALTER TABLE post_batches ADD COLUMN post_id integer REFERENCES posts(id);
ALTER TABLE post_batches ADD COLUMN batch_id integer REFERENCES batches(id);
ALTER TABLE post_batches ADD PRIMARY KEY (post_id, batch_id);
