-- ============================================
-- UUID TO INTEGER ID MIGRATION - FRESH START
-- ============================================
-- WARNING: This script will DROP ALL TABLES and recreate them with INTEGER IDs
-- Make sure you have backed up any data you want to keep!

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS user_rankings CASCADE;
DROP TABLE IF EXISTS chapter_contents CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ============================================
-- TABLE: members (users)
-- ============================================
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    password TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: subjects
-- ============================================
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: product_categories
-- ============================================
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    price NUMERIC(10, 2) DEFAULT 0,
    description TEXT,
    image TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: courses
-- ============================================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    category TEXT DEFAULT 'General',
    level TEXT DEFAULT 'Beginner',
    duration TEXT DEFAULT '0h',
    "order" INTEGER DEFAULT 0,
    allowed_batches INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: batches
-- ============================================
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: chapters
-- ============================================
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: chapter_contents
-- ============================================
CREATE TABLE chapter_contents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    type TEXT NOT NULL, -- 'video', 'pdf', 'quiz', 'html'
    url TEXT,
    file_path TEXT,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    exam_id INTEGER, -- Will reference exams(id)
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: exams
-- ============================================
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    total_marks NUMERIC(10, 2),
    passing_marks NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Exam settings
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    randomize_questions BOOLEAN DEFAULT false,
    randomize_options BOOLEAN DEFAULT false,
    auto_submit_on_timeout BOOLEAN DEFAULT true,
    negative_marking_enabled BOOLEAN DEFAULT false,
    negative_marks_per_question NUMERIC(5, 2) DEFAULT 0,
    detect_tab_switch BOOLEAN DEFAULT false,
    restrict_copy_paste BOOLEAN DEFAULT false,
    max_attempts INTEGER DEFAULT 1,
    attempt_gap_minutes INTEGER DEFAULT 0,
    marks_per_question NUMERIC(5, 2),
    number_of_questions INTEGER,
    variable_marks BOOLEAN DEFAULT false,
    
    -- Result display settings
    show_answers BOOLEAN DEFAULT true,
    show_score BOOLEAN DEFAULT true,
    show_percentile BOOLEAN DEFAULT false,
    show_pass_or_fail BOOLEAN DEFAULT true,
    enable_ranks BOOLEAN DEFAULT false,
    round_off_marks BOOLEAN DEFAULT false
);

-- ============================================
-- TABLE: questions
-- ============================================
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    options JSONB,
    answer TEXT,
    explanation TEXT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    difficulty_level TEXT,
    percentage_correct NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: posts
-- ============================================
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cover_image TEXT,
    summary TEXT,
    content TEXT,
    product_name TEXT,
    access_control TEXT,
    allow_comments BOOLEAN DEFAULT false,
    publication_date TIMESTAMP WITH TIME ZONE,
    allowed_products INTEGER[],
    is_deleted BOOLEAN DEFAULT false
);

-- ============================================
-- TABLE: exam_attempts
-- ============================================
CREATE TABLE exam_attempts (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    score NUMERIC(10, 2),
    total_marks NUMERIC(10, 2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    answers JSONB,
    status TEXT DEFAULT 'in_progress'
);

-- ============================================
-- TABLE: bookmarks
-- ============================================
CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, question_id)
);

-- ============================================
-- TABLE: orders
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for chapter_contents.exam_id now that exams table exists
ALTER TABLE chapter_contents 
    ADD CONSTRAINT fk_chapter_contents_exam 
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_chapter_contents_chapter_id ON chapter_contents(chapter_id);
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_member_id ON exam_attempts(member_id);
CREATE INDEX idx_bookmarks_member_id ON bookmarks(member_id);
CREATE INDEX idx_orders_member_id ON orders(member_id);

-- Success message
SELECT 'Schema recreated successfully with INTEGER IDs!' as message;
