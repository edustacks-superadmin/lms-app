ALTER TABLE institute_settings 
ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT 'example@upi';

COMMENT ON COLUMN institute_settings.upi_id IS 'The UPI ID used for receiving payments.';
