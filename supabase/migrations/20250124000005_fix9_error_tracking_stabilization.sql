-- FIX 9 — Error Tracking Stabilization
-- Centralize errors, log to Supabase, UI fallback

-- 1. Create error_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pathname TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Additional fields for error tracking
  error_code TEXT,
  error_category TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security if not already enabled
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Users can view their own errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'error_logs' 
    AND policyname = 'Users can view their own errors'
  ) THEN
    CREATE POLICY "Users can view their own errors" 
    ON public.error_logs 
    FOR SELECT 
    USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;

  -- Allow authenticated users to insert errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'error_logs' 
    AND policyname = 'Users can insert error logs'
  ) THEN
    CREATE POLICY "Users can insert error logs" 
    ON public.error_logs 
    FOR INSERT 
    WITH CHECK (true);
  END IF;

  -- Admins can view all errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'error_logs' 
    AND policyname = 'Admins can view all errors'
  ) THEN
    CREATE POLICY "Admins can view all errors" 
    ON public.error_logs 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_subscriptions 
        WHERE user_id = auth.uid() AND plan = 'admin'
      )
    );
  END IF;
END $$;

-- Add additional columns if table already exists (for backward compatibility)
DO $$ 
BEGIN
  -- Add error_code if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'error_code'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN error_code TEXT;
  END IF;

  -- Add error_category if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'error_category'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN error_category TEXT;
  END IF;

  -- Add resolved if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'resolved'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN resolved BOOLEAN DEFAULT false;
  END IF;

  -- Add resolved_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;

  -- Add resolved_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add occurrence_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'occurrence_count'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN occurrence_count INTEGER DEFAULT 1;
  END IF;

  -- Add first_seen if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'first_seen'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN first_seen TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Add last_seen if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs' 
    AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.error_logs ADD COLUMN last_seen TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_pathname ON public.error_logs(pathname);

-- 2. Create function to aggregate similar errors
CREATE OR REPLACE FUNCTION public.aggregate_error(
  p_error_message TEXT,
  p_error_stack TEXT,
  p_error_type TEXT,
  p_context JSONB,
  p_user_id UUID,
  p_pathname TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  error_id UUID;
  existing_error_id UUID;
  normalized_message TEXT;
BEGIN
  -- Normalize error message for grouping (remove timestamps, IDs, etc.)
  normalized_message := REGEXP_REPLACE(p_error_message, '\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}', '[TIMESTAMP]', 'g');
  normalized_message := REGEXP_REPLACE(normalized_message, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '[UUID]', 'gi');
  
  -- Try to find existing similar error in last 24 hours
  SELECT id INTO existing_error_id
  FROM public.error_logs
  WHERE error_message LIKE normalized_message || '%'
    AND error_type = p_error_type
    AND pathname = p_pathname
    AND created_at > now() - INTERVAL '24 hours'
    AND resolved = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF existing_error_id IS NOT NULL THEN
    -- Update existing error: increment count and update last_seen
    UPDATE public.error_logs
    SET 
      occurrence_count = occurrence_count + 1,
      last_seen = now(),
      context = context || p_context -- Merge contexts
    WHERE id = existing_error_id;
    
    RETURN existing_error_id;
  ELSE
    -- Insert new error
    INSERT INTO public.error_logs (
      error_message,
      error_stack,
      error_type,
      context,
      user_id,
      pathname,
      user_agent,
      error_code,
      error_category,
      first_seen,
      last_seen
    )
    VALUES (
      p_error_message,
      p_error_stack,
      p_error_type,
      p_context,
      p_user_id,
      p_pathname,
      COALESCE(p_context->>'userAgent', NULL),
      COALESCE(p_context->>'errorCode', NULL),
      COALESCE(p_context->>'category', NULL),
      now(),
      now()
    )
    RETURNING id INTO error_id;
    
    RETURN error_id;
  END IF;
END;
$$;

-- 3. Create function to get error statistics
CREATE OR REPLACE FUNCTION public.get_error_statistics(
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can view error statistics';
  END IF;
  
  SELECT jsonb_build_object(
    'total_errors', COUNT(*),
    'unique_errors', COUNT(DISTINCT error_message),
    'errors_by_severity', jsonb_object_agg(severity, count) FILTER (WHERE severity IS NOT NULL),
    'errors_by_category', jsonb_object_agg(error_category, count) FILTER (WHERE error_category IS NOT NULL),
    'errors_by_pathname', jsonb_object_agg(pathname, count) FILTER (WHERE pathname IS NOT NULL),
    'most_common_errors', (
      SELECT jsonb_agg(jsonb_build_object(
        'error_message', error_message,
        'count', occurrence_count,
        'last_seen', last_seen
      ))
      FROM (
        SELECT error_message, MAX(occurrence_count) as occurrence_count, MAX(last_seen) as last_seen
        FROM public.error_logs
        WHERE created_at > now() - (p_days || ' days')::INTERVAL
        GROUP BY error_message
        ORDER BY occurrence_count DESC
        LIMIT 10
      ) top_errors
    ),
    'unresolved_errors', COUNT(*) FILTER (WHERE resolved = false),
    'period_days', p_days
  ) INTO result
  FROM (
    SELECT 
      severity,
      error_category,
      pathname,
      COUNT(*) as count
    FROM public.error_logs
    WHERE created_at > now() - (p_days || ' days')::INTERVAL
    GROUP BY severity, error_category, pathname
  ) stats;
  
  RETURN result;
END;
$$;

-- 4. Create function to mark error as resolved
CREATE OR REPLACE FUNCTION public.resolve_error(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can resolve errors';
  END IF;
  
  UPDATE public.error_logs
  SET 
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = p_error_id;
  
  RETURN TRUE;
END;
$$;

-- 5. Create function to get recent errors for UI fallback
CREATE OR REPLACE FUNCTION public.get_recent_errors(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  error_message TEXT,
  error_type TEXT,
  severity TEXT,
  pathname TEXT,
  created_at TIMESTAMPTZ,
  occurrence_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can view errors';
  END IF;
  
  RETURN QUERY
  SELECT 
    el.id,
    el.error_message,
    el.error_type,
    el.severity,
    el.pathname,
    el.created_at,
    el.occurrence_count
  FROM public.error_logs el
  WHERE el.resolved = false
  ORDER BY el.last_seen DESC, el.occurrence_count DESC
  LIMIT p_limit;
END;
$$;

-- 6. Create index for better error query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON public.error_logs(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON public.error_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- 7. Create view for error summary (for admins)
CREATE OR REPLACE VIEW public.error_summary AS
SELECT 
  error_message,
  error_type,
  error_category,
  pathname,
  severity,
  COUNT(*) as total_occurrences,
  SUM(occurrence_count) as total_count,
  MAX(last_seen) as last_seen,
  MIN(first_seen) as first_seen,
  COUNT(DISTINCT user_id) as affected_users,
  resolved
FROM public.error_logs
GROUP BY error_message, error_type, error_category, pathname, severity, resolved;

-- Enable RLS on view
ALTER VIEW public.error_summary SET (security_invoker = true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.aggregate_error(TEXT, TEXT, TEXT, JSONB, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_error(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_errors(INTEGER) TO authenticated;
GRANT SELECT ON public.error_summary TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.aggregate_error(TEXT, TEXT, TEXT, JSONB, UUID, TEXT) IS 'Aggregates similar errors to reduce duplicate entries';
COMMENT ON FUNCTION public.get_error_statistics(INTEGER) IS 'Gets error statistics for the specified number of days. Admin only.';
COMMENT ON FUNCTION public.resolve_error(UUID) IS 'Marks an error as resolved. Admin only.';
COMMENT ON FUNCTION public.get_recent_errors(INTEGER) IS 'Gets recent unresolved errors. Admin only.';
COMMENT ON VIEW public.error_summary IS 'Summary view of errors grouped by message, type, and category';

