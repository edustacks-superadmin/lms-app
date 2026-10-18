-- Drop existing policies first (before dropping tables)
DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can update tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON tags;

DROP POLICY IF EXISTS "Anyone can view course_tags" ON course_tags;
DROP POLICY IF EXISTS "Authenticated users can insert course_tags" ON course_tags;
DROP POLICY IF EXISTS "Authenticated users can delete course_tags" ON course_tags;

DROP POLICY IF EXISTS "Anyone can view exam_tags" ON exam_tags;
DROP POLICY IF EXISTS "Authenticated users can insert exam_tags" ON exam_tags;
DROP POLICY IF EXISTS "Authenticated users can delete exam_tags" ON exam_tags;

-- Drop existing tables (if you want to recreate them)
-- Uncomment the lines below if you want to start fresh
-- DROP TABLE IF EXISTS course_tags CASCADE;
-- DROP TABLE IF EXISTS exam_tags CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;

-- Create tags table if not exists
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#2196f3',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create course_tags junction table if not exists
CREATE TABLE IF NOT EXISTS course_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, tag_id)
);

-- Create exam_tags junction table if not exists
CREATE TABLE IF NOT EXISTS exam_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, tag_id)
);

-- Enable RLS (won't error if already enabled)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Anyone can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tags" ON tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tags" ON tags FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete tags" ON tags FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for course_tags
CREATE POLICY "Anyone can view course_tags" ON course_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert course_tags" ON course_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete course_tags" ON course_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for exam_tags
CREATE POLICY "Anyone can view exam_tags" ON exam_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert exam_tags" ON exam_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete exam_tags" ON exam_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_tags_course_id ON course_tags(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tags_tag_id ON course_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_exam_tags_exam_id ON exam_tags(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_tags_tag_id ON exam_tags(tag_id);
