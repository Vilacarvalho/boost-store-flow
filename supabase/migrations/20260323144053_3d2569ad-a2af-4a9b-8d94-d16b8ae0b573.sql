-- 1. Add origin tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'signup';

-- 2. Update trigger to skip admin-created users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  new_store_id uuid;
  user_name text;
BEGIN
  -- Skip if user was created by admin panel
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    RETURN NEW;
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  INSERT INTO public.organizations (name)
  VALUES (user_name || ' - Minha Empresa')
  RETURNING id INTO new_org_id;

  INSERT INTO public.stores (name, organization_id)
  VALUES ('Loja Principal', new_org_id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.profiles (id, name, email, organization_id, store_id, created_via)
  VALUES (NEW.id, user_name, NEW.email, new_org_id, NULL, 'signup');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::public.app_role);

  RETURN NEW;
END;
$function$;