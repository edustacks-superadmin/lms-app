-- Add missing SMTP columns to institute_settings table
ALTER TABLE "public"."institute_settings" 
ADD COLUMN IF NOT EXISTS "smtp_host" TEXT DEFAULT 'smtp.gmail.com',
ADD COLUMN IF NOT EXISTS "smtp_port" INTEGER DEFAULT 465,
ADD COLUMN IF NOT EXISTS "smtp_user" TEXT,
ADD COLUMN IF NOT EXISTS "smtp_password" TEXT,
ADD COLUMN IF NOT EXISTS "smtp_from_email" TEXT;
