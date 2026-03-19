ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_loss()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_org_id uuid;
  remaining_admins integer;
BEGIN
  IF OLD.role <> 'admin'::public.app_role THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'admin'::public.app_role THEN
    RETURN NEW;
  END IF;

  SELECT organization_id
  INTO target_org_id
  FROM public.profiles
  WHERE id = OLD.user_id;

  IF target_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)
  INTO remaining_admins
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::public.app_role
    AND p.organization_id = target_org_id
    AND ur.user_id <> OLD.user_id;

  IF remaining_admins = 0 THEN
    RAISE EXCEPTION 'A organização deve manter pelo menos um admin ativo';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_admin_loss_on_user_roles ON public.user_roles;
CREATE TRIGGER prevent_last_admin_loss_on_user_roles
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_loss();