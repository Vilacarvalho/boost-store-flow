
ALTER TABLE public.content_categories
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS allowed_roles text[] DEFAULT ARRAY['super_admin','admin','supervisor','manager','seller'];
