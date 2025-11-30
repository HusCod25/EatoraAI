-- FIX 10 — Performance Optimization
-- Cache queries, debounce search, reduce latency

-- 1. Create query cache table for frequently accessed data
CREATE TABLE IF NOT EXISTS public.query_cache (
  cache_key TEXT PRIMARY KEY,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on query_cache
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Only admins can view cache
CREATE POLICY "Admins can view query_cache" 
ON public.query_cache 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

-- Function to get cached data
CREATE OR REPLACE FUNCTION public.get_cached_data(
  p_cache_key TEXT,
  p_ttl_seconds INTEGER DEFAULT 300 -- 5 minutes default
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cached_result JSONB;
  cache_expires TIMESTAMPTZ;
BEGIN
  SELECT cache_data, expires_at INTO cached_result, cache_expires
  FROM public.query_cache
  WHERE cache_key = p_cache_key;
  
  -- Check if cache exists and is valid
  IF cached_result IS NOT NULL AND cache_expires > now() THEN
    -- Update access stats
    UPDATE public.query_cache
    SET 
      access_count = access_count + 1,
      last_accessed = now()
    WHERE cache_key = p_cache_key;
    
    RETURN cached_result;
  END IF;
  
  -- Cache expired or doesn't exist
  RETURN NULL;
END;
$$;

-- Function to set cached data
CREATE OR REPLACE FUNCTION public.set_cached_data(
  p_cache_key TEXT,
  p_cache_data JSONB,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.query_cache (cache_key, cache_data, expires_at)
  VALUES (p_cache_key, p_cache_data, now() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (cache_key) DO UPDATE
  SET 
    cache_data = EXCLUDED.cache_data,
    expires_at = EXCLUDED.expires_at,
    access_count = 0,
    last_accessed = now();
  
  RETURN TRUE;
END;
$$;

-- Function to clear expired cache
CREATE OR REPLACE FUNCTION public.clear_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.query_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2. Create materialized view for ingredient search (refreshed periodically)
-- Use dynamic SQL to handle case-sensitive table name
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredients') THEN
    EXECUTE 'CREATE MATERIALIZED VIEW IF NOT EXISTS public.ingredients_search_cache AS
      SELECT 
        id,
        name,
        LOWER(name) as normalized_name,
        calories,
        protein,
        carbs,
        fat,
        category,
        unit,
        LOWER(name) || '' '' || COALESCE(category, '''') as search_text
      FROM public."Ingredients"';
  END IF;
END $$;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_search_cache_id ON public.ingredients_search_cache(id);
CREATE INDEX IF NOT EXISTS idx_ingredients_search_cache_normalized ON public.ingredients_search_cache(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ingredients_search_cache_text ON public.ingredients_search_cache USING gin(to_tsvector('english', search_text));

-- Function to refresh ingredient search cache
CREATE OR REPLACE FUNCTION public.refresh_ingredients_search_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ingredients_search_cache;
END;
$$;

-- 3. Create optimized function for ingredient search (using materialized view)
CREATE OR REPLACE FUNCTION public.search_ingredients_optimized(
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  category TEXT,
  unit TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if materialized view exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'ingredients_search_cache') THEN
    RETURN QUERY
    SELECT 
      isc.id::TEXT,
      isc.name,
      isc.calories,
      isc.protein,
      isc.carbs,
      isc.fat,
      isc.category,
      isc.unit
    FROM public.ingredients_search_cache isc
    WHERE isc.normalized_name LIKE '%' || LOWER(p_search_query) || '%'
       OR isc.search_text LIKE '%' || LOWER(p_search_query) || '%'
    ORDER BY 
      CASE 
        WHEN isc.normalized_name = LOWER(p_search_query) THEN 1
        WHEN isc.normalized_name LIKE LOWER(p_search_query) || '%' THEN 2
        ELSE 3
      END,
      isc.name
    LIMIT p_limit;
  END IF;
END;
$$;

-- 4. Create indexes for performance on frequently queried tables
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_status ON public.user_subscriptions(user_id, subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON public.user_subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_meals_user_id_created ON public.generated_meals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_id_created ON public.saved_meals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 5. Create function to get user subscription with caching
CREATE OR REPLACE FUNCTION public.get_user_subscription_cached(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cache_key TEXT;
  cached_result JSONB;
  subscription_data JSONB;
BEGIN
  -- Generate cache key
  cache_key := 'user_subscription:' || p_user_id::TEXT;
  
  -- Try to get from cache
  cached_result := public.get_cached_data(cache_key, 60); -- 1 minute cache
  
  IF cached_result IS NOT NULL THEN
    RETURN cached_result;
  END IF;
  
  -- Cache miss - fetch from database
  SELECT jsonb_build_object(
    'plan', plan,
    'subscription_status', subscription_status,
    'current_period_end', current_period_end,
    'stripe_customer_id', stripe_customer_id,
    'stripe_subscription_id', stripe_subscription_id
  ) INTO subscription_data
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;
  
  -- Cache the result
  IF subscription_data IS NOT NULL THEN
    PERFORM public.set_cached_data(cache_key, subscription_data, 60);
  END IF;
  
  RETURN subscription_data;
END;
$$;

-- 6. Create function to get plan limits with caching
CREATE OR REPLACE FUNCTION public.get_plan_limits_cached(p_plan TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cache_key TEXT;
  cached_result JSONB;
  limits_data JSONB;
BEGIN
  -- Generate cache key
  cache_key := 'plan_limits:' || p_plan;
  
  -- Try to get from cache (plan limits rarely change, cache for 1 hour)
  cached_result := public.get_cached_data(cache_key, 3600);
  
  IF cached_result IS NOT NULL THEN
    RETURN cached_result;
  END IF;
  
  -- Cache miss - fetch from database
  SELECT row_to_json(pl)::jsonb INTO limits_data
  FROM public.plan_limits pl
  WHERE plan = p_plan::subscription_plan;
  
  -- Cache the result
  IF limits_data IS NOT NULL THEN
    PERFORM public.set_cached_data(cache_key, limits_data, 3600);
  END IF;
  
  RETURN limits_data;
END;
$$;

-- 7. Create scheduled job to refresh materialized views and clear cache
-- Note: This would typically be set up via pg_cron extension
-- For now, we create a function that can be called manually or via cron

-- 8. Add indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_user_activity_weekly_reset ON public.user_activity(weekly_reset_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_cycle_start ON public.user_activity(subscription_cycle_start_date);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_cached_data(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_cached_data(TEXT, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_expired_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_ingredients_search_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_ingredients_optimized(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_cached(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_limits_cached(TEXT) TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON public.ingredients_search_cache TO authenticated;

-- Add comments
COMMENT ON TABLE public.query_cache IS 'Query result cache for frequently accessed data';
COMMENT ON MATERIALIZED VIEW public.ingredients_search_cache IS 'Materialized view for fast ingredient search';
COMMENT ON FUNCTION public.get_cached_data(TEXT, INTEGER) IS 'Gets cached data if available and not expired';
COMMENT ON FUNCTION public.set_cached_data(TEXT, JSONB, INTEGER) IS 'Sets cached data with TTL';
COMMENT ON FUNCTION public.clear_expired_cache() IS 'Clears expired cache entries';
COMMENT ON FUNCTION public.refresh_ingredients_search_cache() IS 'Refreshes the ingredients search materialized view';
COMMENT ON FUNCTION public.search_ingredients_optimized(TEXT, INTEGER) IS 'Optimized ingredient search using materialized view';
COMMENT ON FUNCTION public.get_user_subscription_cached(UUID) IS 'Gets user subscription with caching';
COMMENT ON FUNCTION public.get_plan_limits_cached(TEXT) IS 'Gets plan limits with caching';

