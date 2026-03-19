ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

DROP POLICY IF EXISTS "Admin inserts user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin updates user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin deletes user_roles" ON public.user_roles;

CREATE POLICY "Admin inserts user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = user_roles.user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
  )
);

CREATE POLICY "Admin updates user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = user_roles.user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = user_roles.user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
  )
);

CREATE POLICY "Admin deletes user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = user_roles.user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
  )
);