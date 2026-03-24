
-- Add logo_url to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone authenticated can view logos (public bucket)
CREATE POLICY "Anyone can view org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- Only admin/super_admin can upload logos for their org
CREATE POLICY "Admins upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Only admin/super_admin can update logos
CREATE POLICY "Admins update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Only admin/super_admin can delete logos
CREATE POLICY "Admins delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Allow admin to update org name and logo
CREATE POLICY "Admin updates own organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  id = public.get_user_org_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
