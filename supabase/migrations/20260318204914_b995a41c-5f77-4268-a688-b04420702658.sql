
-- 1. content_categories table
CREATE TABLE public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see org categories" ON public.content_categories
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin inserts categories" ON public.content_categories
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin updates categories" ON public.content_categories
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin deletes categories" ON public.content_categories
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

-- 2. content_views table
CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own views" ON public.content_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own views" ON public.content_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin sees all org views" ON public.content_views
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') AND
    EXISTS (
      SELECT 1 FROM public.contents c
      WHERE c.id = content_views.content_id
      AND c.organization_id = get_user_org_id(auth.uid())
    )
  );

-- 3. Add is_pinned, is_required to contents
ALTER TABLE public.contents
  ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN is_required boolean NOT NULL DEFAULT false;
