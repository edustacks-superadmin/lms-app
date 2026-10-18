-- Create registration_fields table for managing custom fields
CREATE TABLE IF NOT EXISTS public.registration_fields (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Field identification
    field_key text NOT NULL UNIQUE, -- Internal key like 'photo', 'dob', 'custom_hobby'
    field_label text NOT NULL, -- Display label like 'Profile Photo', 'Date of Birth'
    field_type text NOT NULL, -- 'text', 'email', 'date', 'select', 'file', 'textarea', 'tel', 'number'
    
    -- Field configuration
    is_enabled boolean DEFAULT true,
    is_required boolean DEFAULT false,
    is_preset boolean DEFAULT false, -- true for built-in fields, false for custom
    display_order integer DEFAULT 0,
    
    -- Additional options (for select/radio fields)
    field_options jsonb DEFAULT '[]'::jsonb, -- [{label: 'Male', value: 'male'}, ...]
    
    -- Validation rules
    placeholder text,
    help_text text,
    validation_rules jsonb DEFAULT '{}'::jsonb -- {min: 0, max: 100, pattern: '...'}
);

-- Add custom_data column to members table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' 
        AND column_name = 'custom_data'
    ) THEN
        ALTER TABLE public.members ADD COLUMN custom_data jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_fields_enabled 
    ON public.registration_fields(is_enabled, display_order);

-- Insert preset fields
INSERT INTO public.registration_fields (field_key, field_label, field_type, is_preset, is_enabled, is_required, display_order, placeholder, help_text)
VALUES 
    ('name', 'Full Name', 'text', true, true, true, 1, 'Enter your full name', 'Your full legal name'),
    ('email', 'Email Address', 'email', true, true, true, 2, 'your.email@example.com', 'We will use this for login'),
    ('phone', 'Mobile Number', 'tel', true, false, false, 3, '+1 (555) 000-0000', 'Your contact number'),
    ('dob', 'Date of Birth', 'date', true, false, false, 4, '', 'Your date of birth'),
    ('gender', 'Gender', 'select', true, false, false, 5, 'Select gender', 'Your gender identity'),
    ('photo', 'Profile Photo', 'file', true, false, false, 6, '', 'Upload a profile picture'),
    ('address', 'Address', 'textarea', true, false, false, 7, 'Enter your address', 'Your residential address')
ON CONFLICT (field_key) DO UPDATE SET
    field_label = EXCLUDED.field_label,
    field_type = EXCLUDED.field_type,
    is_preset = EXCLUDED.is_preset;

-- Update gender field with options
UPDATE public.registration_fields 
SET field_options = '[
    {"label": "Male", "value": "male"},
    {"label": "Female", "value": "female"},
    {"label": "Other", "value": "other"},
    {"label": "Prefer not to say", "value": "prefer_not_to_say"}
]'::jsonb
WHERE field_key = 'gender';

-- Enable RLS
ALTER TABLE public.registration_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read registration fields" ON public.registration_fields;
DROP POLICY IF EXISTS "Allow admins to manage registration fields" ON public.registration_fields;

-- Policy: Allow all authenticated users to read fields
CREATE POLICY "Allow authenticated users to read registration fields"
    ON public.registration_fields FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins can insert/update/delete fields
CREATE POLICY "Allow admins to manage registration fields"
    ON public.registration_fields FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.email = auth.jwt() ->> 'email'
            AND members.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_registration_fields_updated_at ON public.registration_fields;
CREATE TRIGGER update_registration_fields_updated_at
    BEFORE UPDATE ON public.registration_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT field_key, field_label, field_type, is_enabled, is_required, display_order 
FROM public.registration_fields 
ORDER BY display_order;
