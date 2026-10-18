-- Add gmail_app_credentials column to institute_settings table
ALTER TABLE "public"."institute_settings" ADD COLUMN "gmail_app_credentials" JSONB;
