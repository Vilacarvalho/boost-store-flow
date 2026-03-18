
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'seller');

-- Create sale status enum
CREATE TYPE public.sale_status AS ENUM ('won', 'lost');

-- Create followup status enum
CREATE TYPE public.followup_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create customer profile type enum
CREATE TYPE public.customer_profile_type AS ENUM ('price', 'quality', 'style', 'urgency');

-- Create period type enum
CREATE TYPE public.period_type AS ENUM ('daily', 'weekly', 'monthly');

-- Organizations (rede de óticas)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Stores (lojas)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  store_id UUID REFERENCES public.stores(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Get user's store_id
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.profiles WHERE id = _user_id
$$;

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT,
  profile_type customer_profile_type,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  status sale_status NOT NULL,
  objection_reason TEXT,
  closing_type TEXT,
  products_shown_count INTEGER DEFAULT 0,
  total_value DECIMAL(10,2) DEFAULT 0,
  driver customer_profile_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sale Steps (checklist)
CREATE TABLE public.sale_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  diagnostic_done BOOLEAN DEFAULT false,
  budget_identified BOOLEAN DEFAULT false,
  presented_benefits BOOLEAN DEFAULT false,
  directed_choice BOOLEAN DEFAULT false,
  closing_attempted BOOLEAN DEFAULT false,
  objection_handled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_steps ENABLE ROW LEVEL SECURITY;

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  user_id UUID REFERENCES auth.users(id),
  period_type period_type NOT NULL DEFAULT 'daily',
  target_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Followups
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status followup_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

-- ============== RLS POLICIES ==============

-- Organizations: users see their own org
CREATE POLICY "Users see own organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id(auth.uid()));

-- Stores: users see stores in own org
CREATE POLICY "Users see stores in own org"
  ON public.stores FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- Profiles: users in same org can see each other
CREATE POLICY "Users see profiles in own org"
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "System inserts profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- User Roles: users see own role
CREATE POLICY "Users see own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Customers
CREATE POLICY "Users see org customers"
  ON public.customers FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users insert customers in own store"
  ON public.customers FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND store_id = public.get_user_store_id(auth.uid())
  );

CREATE POLICY "Users update customers in own store"
  ON public.customers FOR UPDATE
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND store_id = public.get_user_store_id(auth.uid())
  );

-- Sales
CREATE POLICY "Users see org sales"
  ON public.sales FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Sellers insert own sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    AND organization_id = public.get_user_org_id(auth.uid())
    AND store_id = public.get_user_store_id(auth.uid())
  );

-- Sale Steps
CREATE POLICY "Users see sale steps via sale"
  ON public.sale_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND s.organization_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Users insert sale steps"
  ON public.sale_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND s.seller_id = auth.uid()
    )
  );

-- Goals
CREATE POLICY "Users see org goals"
  ON public.goals FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin inserts goals"
  ON public.goals FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Admin updates goals"
  ON public.goals FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.get_user_org_id(auth.uid())
  );

-- Followups
CREATE POLICY "Users see org followups"
  ON public.followups FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Sellers insert followups"
  ON public.followups FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    AND organization_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Sellers update own followups"
  ON public.followups FOR UPDATE
  USING (seller_id = auth.uid());

-- ============== TRIGGERS ==============

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== AUTO-CREATE PROFILE ON SIGNUP ==============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== DASHBOARD HELPER FUNCTIONS ==============

CREATE OR REPLACE FUNCTION public.get_daily_metrics(
  _store_id UUID,
  _date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_sales BIGINT,
  won_sales BIGINT,
  total_value DECIMAL,
  avg_ticket DECIMAL,
  conversion_rate DECIMAL,
  total_attendances BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_sales,
    COUNT(*) FILTER (WHERE status = 'won') AS won_sales,
    COALESCE(SUM(total_value) FILTER (WHERE status = 'won'), 0) AS total_value,
    COALESCE(AVG(total_value) FILTER (WHERE status = 'won'), 0) AS avg_ticket,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::DECIMAL / COUNT(*)) * 100, 1)
      ELSE 0
    END AS conversion_rate,
    COUNT(*) AS total_attendances
  FROM public.sales
  WHERE store_id = _store_id
    AND created_at::date = _date
$$;

CREATE OR REPLACE FUNCTION public.get_seller_ranking(
  _store_id UUID,
  _date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  seller_id UUID,
  seller_name TEXT,
  total_value DECIMAL,
  won_count BIGINT,
  total_count BIGINT,
  conversion_rate DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.seller_id,
    p.name AS seller_name,
    COALESCE(SUM(s.total_value) FILTER (WHERE s.status = 'won'), 0) AS total_value,
    COUNT(*) FILTER (WHERE s.status = 'won') AS won_count,
    COUNT(*) AS total_count,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE s.status = 'won')::DECIMAL / COUNT(*)) * 100, 1)
      ELSE 0
    END AS conversion_rate
  FROM public.sales s
  JOIN public.profiles p ON p.id = s.seller_id
  WHERE s.store_id = _store_id
    AND s.created_at::date = _date
  GROUP BY s.seller_id, p.name
  ORDER BY total_value DESC
$$;
