SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'institute_settings' AND column_name = 'id';
