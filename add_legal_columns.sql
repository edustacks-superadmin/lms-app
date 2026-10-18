-- Add missing legal policy columns to institute_settings table
ALTER TABLE public.institute_settings
ADD COLUMN IF NOT EXISTS privacy_policy text,
ADD COLUMN IF NOT EXISTS terms_of_service text,
ADD COLUMN IF NOT EXISTS shipping_policy text,
ADD COLUMN IF NOT EXISTS refund_policy text,
ADD COLUMN IF NOT EXISTS delete_account_policy text;
