
-- Add new columns to sales table for simplified attendance flow
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS product_type text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS objection_description text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS products_count integer DEFAULT 0;
