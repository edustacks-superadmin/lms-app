-- Migration: Add missing exam fields from Testpress
-- Date: 2025-12-05
-- Purpose: Add fields to support full exam functionality including answer visibility control

-- Add show_answers field (CRITICAL)
-- Controls whether students can review exam answers after completing the exam
-- true = show answers, false = only show score
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_answers BOOLEAN DEFAULT true;

-- Add show_score field
-- Controls whether students can see their score after completing the exam
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_score BOOLEAN DEFAULT true;

-- Add show_percentile field
-- Controls whether students can see their percentile rank
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_percentile BOOLEAN DEFAULT false;

-- Add show_pass_or_fail field
-- Controls whether students can see pass/fail status
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_pass_or_fail BOOLEAN DEFAULT true;

-- Add slug field for SEO-friendly URLs
ALTER TABLE exams ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add enable_ranks field for leaderboard functionality
ALTER TABLE exams ADD COLUMN IF NOT EXISTS enable_ranks BOOLEAN DEFAULT false;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_exams_slug ON exams(slug);

-- Add comments to document field purposes
COMMENT ON COLUMN exams.show_answers IS 'Controls if students can review answers after exam completion';
COMMENT ON COLUMN exams.show_score IS 'Controls if students can see their score';
COMMENT ON COLUMN exams.show_percentile IS 'Controls if students can see percentile rank';
COMMENT ON COLUMN exams.show_pass_or_fail IS 'Controls if pass/fail status is displayed';
COMMENT ON COLUMN exams.slug IS 'SEO-friendly URL identifier';
COMMENT ON COLUMN exams.enable_ranks IS 'Enable leaderboard/ranking for this exam';
