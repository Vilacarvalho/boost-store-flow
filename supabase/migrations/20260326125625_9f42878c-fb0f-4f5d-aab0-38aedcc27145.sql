
-- 1) Add sale_category and sale_subcategory to sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_category text,
  ADD COLUMN IF NOT EXISTS sale_subcategory text;

-- 2) Create turn_queue table
CREATE TABLE public.turn_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting', -- waiting, attending
  entered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one entry per seller per store
ALTER TABLE public.turn_queue ADD CONSTRAINT turn_queue_store_seller_unique UNIQUE (store_id, seller_id);

-- Enable RLS
ALTER TABLE public.turn_queue ENABLE ROW LEVEL SECURITY;

-- RLS: Users in same org can see turn queue for their store
CREATE POLICY "Users see store turn queue"
ON public.turn_queue FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT s.id FROM public.stores s WHERE s.organization_id = get_user_org_id(auth.uid())
  )
);

-- Sellers/managers can insert themselves
CREATE POLICY "Users insert own turn"
ON public.turn_queue FOR INSERT TO authenticated
WITH CHECK (seller_id = auth.uid());

-- Users can update their own entry
CREATE POLICY "Users update own turn"
ON public.turn_queue FOR UPDATE TO authenticated
USING (seller_id = auth.uid());

-- Users can delete their own entry
CREATE POLICY "Users delete own turn"
ON public.turn_queue FOR DELETE TO authenticated
USING (seller_id = auth.uid());

-- Managers can manage turn queue for their store
CREATE POLICY "Managers manage store turn queue"
ON public.turn_queue FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND store_id = get_user_store_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND store_id = get_user_store_id(auth.uid())
);

-- Admin full access on turn_queue
CREATE POLICY "Admin manage turn queue"
ON public.turn_queue FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND store_id IN (SELECT s.id FROM public.stores s WHERE s.organization_id = get_user_org_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND store_id IN (SELECT s.id FROM public.stores s WHERE s.organization_id = get_user_org_id(auth.uid()))
);

-- Super admin full access
CREATE POLICY "Super admin turn queue"
ON public.turn_queue FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Enable realtime for turn_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.turn_queue;
