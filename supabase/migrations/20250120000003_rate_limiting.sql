-- Rate Limiting Table
-- Tracks API call frequency to prevent abuse

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own rate limit records
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get current window start (rounded to nearest window)
  v_window_start := date_trunc('hour', now()) + 
                     (EXTRACT(MINUTE FROM now())::INTEGER / p_window_minutes)::INTEGER * 
                     (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get or create rate limit record
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_current_count;
  
  -- Clean up old records (older than 24 hours)
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Return true if under limit, false if over
  RETURN v_current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Add comments
COMMENT ON TABLE public.rate_limits IS 'Tracks API call frequency per user per endpoint for rate limiting';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if user has exceeded rate limit for given endpoint. Returns true if under limit, false if over.';

