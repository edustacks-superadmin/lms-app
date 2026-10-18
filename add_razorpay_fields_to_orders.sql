-- Add Razorpay payment tracking fields to orders table
-- This allows us to track both UPI and Razorpay payments

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'upi', -- 'razorpay' or 'upi'
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Note: user_id and user_email columns are already being added by the existing context
-- original_price, discount_amount, coupon_code, offer_id already exist from add_offer_columns_to_orders.sql
