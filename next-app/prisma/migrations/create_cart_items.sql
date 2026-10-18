CREATE TABLE IF NOT EXISTS public.cart_items (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  institute_id BIGINT DEFAULT 10,
  UNIQUE(member_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_member_id ON public.cart_items(member_id);
