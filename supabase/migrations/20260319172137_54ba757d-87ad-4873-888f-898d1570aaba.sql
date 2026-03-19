
-- Add DELETE policy for admin on stores
CREATE POLICY "Admin deletes stores"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_org_id(auth.uid())
  );
