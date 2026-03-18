
DROP FUNCTION IF EXISTS public.get_daily_metrics(uuid, date);
DROP FUNCTION IF EXISTS public.get_seller_ranking(uuid, date);

CREATE FUNCTION public.get_daily_metrics(_store_id uuid, _date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_sales bigint, won_sales bigint, total_value numeric, avg_ticket numeric, conversion_rate numeric, total_attendances bigint, avg_pa numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
    COUNT(*) AS total_attendances,
    COALESCE(AVG(products_count) FILTER (WHERE status = 'won' AND products_count > 0), 0) AS avg_pa
  FROM public.sales
  WHERE store_id = _store_id
    AND created_at::date = _date
$$;

CREATE FUNCTION public.get_seller_ranking(_store_id uuid, _date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(seller_id uuid, seller_name text, total_value numeric, won_count bigint, total_count bigint, conversion_rate numeric, avg_pa numeric)
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
    COALESCE(AVG(s.products_count) FILTER (WHERE s.status = 'won' AND s.products_count > 0), 0) AS avg_pa
  FROM public.sales s
  JOIN public.profiles p ON p.id = s.seller_id
  WHERE s.store_id = _store_id
    AND s.created_at::date = _date
  GROUP BY s.seller_id, p.name
  ORDER BY total_value DESC
$$;
