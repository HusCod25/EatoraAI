-- Create user_activity_log table for rate limiting
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.user_activity_log;

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own activity logs (rate limiting enforced by trigger)
CREATE POLICY "Users can insert their own activity logs" 
ON public.user_activity_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
DROP INDEX IF EXISTS idx_user_activity_log_user_action_created;
CREATE INDEX idx_user_activity_log_user_action_created ON public.user_activity_log(user_id, action, created_at);

-- Function to check rate limit before insert
CREATE OR REPLACE FUNCTION public.check_rate_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_request_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_max_requests INTEGER := 5; -- Max 5 requests per 30 seconds
  v_window_seconds INTEGER := 30; -- 30 seconds window
  v_oldest_request_time TIMESTAMPTZ;
  v_seconds_until_unblock INTEGER;
BEGIN
  -- Calculate window start (30 seconds ago)
  v_window_start := now() - (v_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in the last 30 seconds
  SELECT COUNT(*) INTO v_request_count
  FROM public.user_activity_log
  WHERE user_id = NEW.user_id
    AND action = NEW.action
    AND created_at >= v_window_start;
  
  -- If limit exceeded (5 requests in 30 seconds), block the request
  IF v_request_count >= v_max_requests THEN
    -- Get the oldest request time in the window to calculate when user can try again
    SELECT MIN(created_at) INTO v_oldest_request_time
    FROM public.user_activity_log
    WHERE user_id = NEW.user_id
      AND action = NEW.action
      AND created_at >= v_window_start;
    
    -- Calculate seconds until the oldest request expires (30 seconds from oldest request)
    IF v_oldest_request_time IS NOT NULL THEN
      v_seconds_until_unblock := v_window_seconds - EXTRACT(EPOCH FROM (now() - v_oldest_request_time))::INTEGER;
      IF v_seconds_until_unblock < 0 THEN
        v_seconds_until_unblock := 0;
      END IF;
      
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Rate limit: Too many requests. Please wait ' || v_seconds_until_unblock || ' seconds before trying again.';
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Rate limit: Too many requests. Please wait a few seconds before trying again.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce rate limiting
DROP TRIGGER IF EXISTS check_rate_limit_trigger ON public.user_activity_log;
CREATE TRIGGER check_rate_limit_trigger
  BEFORE INSERT ON public.user_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rate_limit_before_insert();

-- Add comment
COMMENT ON TABLE public.user_activity_log IS 'Logs user activity for rate limiting purposes';
COMMENT ON FUNCTION public.check_rate_limit_before_insert() IS 'Enforces rate limiting: max 5 requests per 30 seconds per user per action';

