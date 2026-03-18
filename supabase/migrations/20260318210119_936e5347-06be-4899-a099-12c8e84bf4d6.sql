
-- 1. Create a SECURITY DEFINER function to check content access without RLS
CREATE OR REPLACE FUNCTION public.user_can_access_content(_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM content_access ca
    JOIN user_roles ur ON ur.role = ca.role AND ur.user_id = auth.uid()
    WHERE ca.content_id = _content_id
  );
$$;

-- 2. Drop all existing policies on contents
DROP POLICY IF EXISTS "Admin deletes contents" ON public.contents;
DROP POLICY IF EXISTS "Admin inserts contents" ON public.contents;
DROP POLICY IF EXISTS "Admin updates contents" ON public.contents;
DROP POLICY IF EXISTS "Users see accessible contents" ON public.contents;

-- 3. Recreate contents policies WITHOUT recursion
CREATE POLICY "Admin inserts contents" ON public.contents
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);

CREATE POLICY "Admin updates contents" ON public.contents
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);

CREATE POLICY "Admin deletes contents" ON public.contents
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);

-- Admin sees all org contents (no date/access filter)
CREATE POLICY "Admin sees all contents" ON public.contents
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);

-- Non-admin users see contents filtered by org, store, role, dates
CREATE POLICY "Users see permitted contents" ON public.contents
FOR SELECT TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  AND (store_id IS NULL OR store_id = get_user_store_id(auth.uid()))
  AND start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  AND public.user_can_access_content(id)
);

-- 4. Fix content_access SELECT policy to avoid querying contents
DROP POLICY IF EXISTS "Users see content_access" ON public.content_access;

CREATE POLICY "Users see content_access" ON public.content_access
FOR SELECT TO authenticated
USING (true);

-- 5. Fix content_views policies that query contents
DROP POLICY IF EXISTS "Admin sees all org views" ON public.content_views;

CREATE POLICY "Admin sees all org views" ON public.content_views
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
