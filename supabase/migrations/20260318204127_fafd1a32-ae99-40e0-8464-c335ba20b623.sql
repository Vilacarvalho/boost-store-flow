
-- Create contents table
CREATE TABLE public.contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  store_id uuid REFERENCES public.stores(id),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Comunicados',
  content_type text NOT NULL DEFAULT 'link',
  file_url text,
  external_url text,
  is_featured boolean NOT NULL DEFAULT false,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create content_access table
CREATE TABLE public.content_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  role public.app_role NOT NULL
);

-- Enable RLS
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access ENABLE ROW LEVEL SECURITY;

-- RLS: Admin manages contents
CREATE POLICY "Admin inserts contents"
  ON public.contents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin updates contents"
  ON public.contents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin deletes contents"
  ON public.contents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

-- RLS: Users see contents in their org, for their store (or null store = all), for their role, within date range
CREATE POLICY "Users see accessible contents"
  ON public.contents FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (store_id IS NULL OR store_id = get_user_store_id(auth.uid()) OR has_role(auth.uid(), 'admin'))
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM public.content_access ca
      JOIN public.user_roles ur ON ur.role = ca.role AND ur.user_id = auth.uid()
      WHERE ca.content_id = contents.id
    )
  );

-- RLS: content_access readable by org users, manageable by admin
CREATE POLICY "Users see content_access"
  ON public.content_access FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = content_access.content_id
    AND c.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Admin inserts content_access"
  ON public.content_access FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deletes content_access"
  ON public.content_access FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for content files
INSERT INTO storage.buckets (id, name, public) VALUES ('content-files', 'content-files', true);

-- Storage policies
CREATE POLICY "Admin uploads content files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-files' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read content files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'content-files');
