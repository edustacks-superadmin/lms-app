-- Add testpress_id to question_folders table
ALTER TABLE "question_folders" ADD COLUMN "testpress_id" INTEGER UNIQUE;
