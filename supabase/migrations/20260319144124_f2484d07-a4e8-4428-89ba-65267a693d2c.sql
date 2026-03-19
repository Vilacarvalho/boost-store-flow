CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  new_store_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  -- Create a new organization for this user
  INSERT INTO public.organizations (name)
  VALUES (user_name || ' - Minha Empresa')
  RETURNING id INTO new_org_id;

  -- Create a default store
  INSERT INTO public.stores (name, organization_id)
  VALUES ('Loja Principal', new_org_id)
  RETURNING id INTO new_store_id;

  -- Create profile linked to the new org (admin has store_id = null)
  INSERT INTO public.profiles (id, name, email, organization_id, store_id)
  VALUES (NEW.id, user_name, NEW.email, new_org_id, NULL);

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::public.app_role);

  RETURN NEW;
END;
$$;

-- Recreate trigger (it already exists but let's ensure it points to updated function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();