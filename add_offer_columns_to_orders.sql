
-- Add columns to orders table to track offer usage
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES offers(id);
