ALTER TABLE institute_settings 
ADD COLUMN IF NOT EXISTS upi_qr_url TEXT;

COMMENT ON COLUMN institute_settings.upi_qr_url IS 'URL of the UPI QR code image for scan and pay.';
