-- Exam Sections Feature Migration
-- Adds support for organizing exam questions into sections with section-specific settings

-- Step 1: Create exam_sections table
CREATE TABLE IF NOT EXISTS exam_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    instructions TEXT,
    total_marks DECIMAL(5,2),
    passing_marks DECIMAL(5,2),
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_exam_section_order UNIQUE(exam_id, section_order)
);

-- Step 2: Create indexes for exam_sections
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sections_order ON exam_sections(exam_id, section_order);

-- Step 3: Add section-related columns to exam_questions
ALTER TABLE exam_questions
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS section_order INTEGER;

-- Step 4: Create index for section lookups
CREATE INDEX IF NOT EXISTS idx_exam_questions_section ON exam_questions(section_id);

-- Step 5: Add comments for documentation
COMMENT ON TABLE exam_sections IS 'Organizes exam questions into sections/parts with specific instructions and marking schemes';
COMMENT ON COLUMN exam_sections.section_name IS 'Display name for the section (e.g., "Part A - Multiple Choice")';
COMMENT ON COLUMN exam_sections.section_order IS 'Order in which sections appear (1, 2, 3, ...)';
COMMENT ON COLUMN exam_sections.instructions IS 'Section-specific instructions shown to students';
COMMENT ON COLUMN exam_sections.total_marks IS 'Total marks available in this section';
COMMENT ON COLUMN exam_sections.passing_marks IS 'Minimum marks required to pass this section (optional)';
COMMENT ON COLUMN exam_sections.is_mandatory IS 'Whether all questions in this section must be answered';

COMMENT ON COLUMN exam_questions.section_id IS 'Reference to exam section (NULL for unsectioned questions)';
COMMENT ON COLUMN exam_questions.is_mandatory IS 'Whether this question must be answered';
COMMENT ON COLUMN exam_questions.section_order IS 'Order of question within its section';
