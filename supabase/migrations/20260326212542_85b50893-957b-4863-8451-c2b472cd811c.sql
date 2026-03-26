
-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Users insert customers in own store" ON public.customers;

-- Sellers and managers: must match own store_id and org
CREATE POLICY "Sellers managers insert customers in own store"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id = get_user_org_id(auth.uid()))
  AND (store_id = get_user_store_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'seller'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Admins: can insert customers in any store within their org
CREATE POLICY "Admins insert customers in own org"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (organization_id = get_user_org_id(auth.uid()))
);

-- Also fix UPDATE policy for admins (currently requires store_id match)
DROP POLICY IF EXISTS "Users update customers in own store" ON public.customers;

CREATE POLICY "Sellers managers update customers in own store"
ON public.customers FOR UPDATE
TO authenticated
USING (
  (organization_id = get_user_org_id(auth.uid()))
  AND (store_id = get_user_store_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'seller'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

CREATE POLICY "Admins update customers in own org"
ON public.customers FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (organization_id = get_user_org_id(auth.uid()))
);
