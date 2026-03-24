
CREATE OR REPLACE FUNCTION public.get_seller_ranking_period(
  _store_id uuid,
  _start_date date,
  _end_date date
)
RETURNS TABLE(
  seller_id uuid,
  seller_name text,
  total_value numeric,
  won_count bigint,
  total_count bigint,
  conversion_rate numeric,
  avg_ticket numeric,
  avg_pa numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    END AS conversion_rate,
    COALESCE(AVG(s.total_value) FILTER (WHERE s.status = 'won'), 0) AS avg_ticket,
    COALESCE(AVG(s.products_count) FILTER (WHERE s.status = 'won' AND s.products_count > 0), 0) AS avg_pa
  FROM public.sales s
  JOIN public.profiles p ON p.id = s.seller_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE s.store_id = _store_id
    AND s.created_at::date >= _start_date
    AND s.created_at::date <= _end_date
    AND p.active = true
    AND (
      ur.role = 'seller'
      OR (ur.role = 'manager' AND p.manager_can_sell = true)
    )
  GROUP BY s.seller_id, p.name
  ORDER BY total_value DESC
$$;
