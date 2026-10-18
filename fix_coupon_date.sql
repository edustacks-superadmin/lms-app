
UPDATE offers 
SET start_date = NOW() - INTERVAL '1 day' 
WHERE code = 'COUPON1';
