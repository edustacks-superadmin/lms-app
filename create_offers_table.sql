-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('coupon', 'repeat_purchase')),
    code TEXT UNIQUE, -- For Coupons
    name TEXT, -- For Repeat Offers
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    applicable_products JSONB DEFAULT '[]'::jsonb, -- Array of Product IDs
    required_products JSONB DEFAULT '[]'::jsonb, -- Array of Product IDs (For Repeat Offers)
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies for Admins (Full Access)
CREATE POLICY "Admins can view all offers"
ON public.offers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.members AS m
        WHERE m.email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can insert offers"
ON public.offers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.members AS m
        WHERE m.email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can update offers"
ON public.offers FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.members AS m
        WHERE m.email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can delete offers"
ON public.offers FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.members AS m
        WHERE m.email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_type ON public.offers(type);
CREATE INDEX IF NOT EXISTS idx_offers_code ON public.offers(code);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
