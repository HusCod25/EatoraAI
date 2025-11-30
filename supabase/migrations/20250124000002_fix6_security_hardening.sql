-- FIX 6 — Security Hardening
-- XSS protection, RLS, API abuse, Stripe fraud protection

-- 1. Enhance RLS policies for better security

-- Ensure all critical tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
-- Use quoted identifier for case-sensitive table name
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredients') THEN
    EXECUTE 'ALTER TABLE public."Ingredients" ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
ALTER TABLE public.pending_ingredients ENABLE ROW LEVEL SECURITY;

-- 2. Create API abuse protection table
CREATE TABLE IF NOT EXISTS public.api_abuse_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_size INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on api_abuse_log
ALTER TABLE public.api_abuse_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view API abuse logs
CREATE POLICY "Admins can view api_abuse_log" 
ON public.api_abuse_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

-- Function to detect API abuse
CREATE OR REPLACE FUNCTION public.check_api_abuse(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count INTEGER;
  abuse_threshold INTEGER := 100; -- requests per minute
BEGIN
  -- Count requests in last minute
  SELECT COUNT(*) INTO request_count
  FROM public.api_abuse_log
  WHERE (
    (user_id = p_user_id AND p_user_id IS NOT NULL)
    OR (ip_address = p_ip_address AND p_user_id IS NULL)
  )
  AND endpoint = p_endpoint
  AND created_at > now() - INTERVAL '1 minute';
  
  -- If threshold exceeded, log and return true
  IF request_count >= abuse_threshold THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to log API request
CREATE OR REPLACE FUNCTION public.log_api_request(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_request_size INTEGER,
  p_response_time_ms INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.api_abuse_log (
    user_id, ip_address, endpoint, method, status_code,
    request_size, response_time_ms
  )
  VALUES (
    p_user_id, p_ip_address, p_endpoint, p_method, p_status_code,
    p_request_size, p_response_time_ms
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 3. Stripe fraud protection table
CREATE TABLE IF NOT EXISTS public.stripe_fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'eur',
  fraud_score INTEGER, -- 0-100, higher = more suspicious
  risk_factors JSONB, -- Array of risk factors
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on stripe_fraud_checks
ALTER TABLE public.stripe_fraud_checks ENABLE ROW LEVEL SECURITY;

-- Users can view their own fraud checks
CREATE POLICY "Users can view their own fraud checks" 
ON public.stripe_fraud_checks 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view all fraud checks
CREATE POLICY "Admins can view all fraud checks" 
ON public.stripe_fraud_checks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

-- Function to check Stripe fraud
CREATE OR REPLACE FUNCTION public.check_stripe_fraud(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_amount DECIMAL,
  p_payment_intent_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fraud_score INTEGER := 0;
  risk_factors JSONB := '[]'::jsonb;
  recent_payments_count INTEGER;
  user_account_age_days INTEGER;
  is_blocked BOOLEAN;
  result JSONB;
BEGIN
  -- Check if user is already blocked
  SELECT COUNT(*) > 0 INTO is_blocked
  FROM public.stripe_fraud_checks
  WHERE user_id = p_user_id
  AND is_blocked = true
  AND created_at > now() - INTERVAL '24 hours';
  
  IF is_blocked THEN
    RETURN jsonb_build_object(
      'is_fraud', true,
      'fraud_score', 100,
      'risk_factors', jsonb_build_array('User is currently blocked'),
      'is_blocked', true
    );
  END IF;
  
  -- Check for multiple recent payments (potential card testing)
  SELECT COUNT(*) INTO recent_payments_count
  FROM public.stripe_fraud_checks
  WHERE (
    (user_id = p_user_id AND p_user_id IS NOT NULL)
    OR (stripe_customer_id = p_stripe_customer_id AND p_user_id IS NULL)
  )
  AND created_at > now() - INTERVAL '1 hour';
  
  IF recent_payments_count > 5 THEN
    fraud_score := fraud_score + 30;
    risk_factors := risk_factors || jsonb_build_object('factor', 'Multiple payments in short time', 'count', recent_payments_count);
  END IF;
  
  -- Check account age (new accounts are riskier)
  SELECT EXTRACT(DAY FROM now() - created_at) INTO user_account_age_days
  FROM auth.users
  WHERE id = p_user_id;
  
  IF user_account_age_days < 1 THEN
    fraud_score := fraud_score + 20;
    risk_factors := risk_factors || jsonb_build_object('factor', 'Very new account', 'age_days', user_account_age_days);
  ELSIF user_account_age_days < 7 THEN
    fraud_score := fraud_score + 10;
    risk_factors := risk_factors || jsonb_build_object('factor', 'New account', 'age_days', user_account_age_days);
  END IF;
  
  -- Check for unusually high amount
  IF p_amount > 100 THEN
    fraud_score := fraud_score + 15;
    risk_factors := risk_factors || jsonb_build_object('factor', 'Unusually high amount', 'amount', p_amount);
  END IF;
  
  -- Log the fraud check
  INSERT INTO public.stripe_fraud_checks (
    user_id, stripe_customer_id, stripe_payment_intent_id,
    amount, fraud_score, risk_factors, is_blocked
  )
  VALUES (
    p_user_id, p_stripe_customer_id, p_payment_intent_id,
    p_amount, fraud_score, risk_factors, fraud_score >= 50
  );
  
  -- Build result
  result := jsonb_build_object(
    'is_fraud', fraud_score >= 50,
    'fraud_score', fraud_score,
    'risk_factors', risk_factors,
    'is_blocked', fraud_score >= 50
  );
  
  RETURN result;
END;
$$;

-- 4. Enhanced RLS policies for Ingredients (public read, authenticated write)
-- Use dynamic SQL to handle case-sensitive table name
DO $$ 
BEGIN
  -- Check if Ingredients table exists (case-sensitive)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredients') THEN
    -- Drop existing policies if they exist
    EXECUTE 'DROP POLICY IF EXISTS "Ingredients are publicly readable" ON public."Ingredients"';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert ingredients" ON public."Ingredients"';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update ingredients" ON public."Ingredients"';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete ingredients" ON public."Ingredients"';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Ingredients are publicly readable" ON public."Ingredients" FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Authenticated users can insert ingredients" ON public."Ingredients" FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Admins can update ingredients" ON public."Ingredients" FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = auth.uid() AND plan = ''admin''))';
    EXECUTE 'CREATE POLICY "Admins can delete ingredients" ON public."Ingredients" FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = auth.uid() AND plan = ''admin''))';
  END IF;
END $$;

-- 5. Create indexes for security tables
CREATE INDEX idx_api_abuse_log_user_id ON public.api_abuse_log(user_id);
CREATE INDEX idx_api_abuse_log_ip_address ON public.api_abuse_log(ip_address);
CREATE INDEX idx_api_abuse_log_created_at ON public.api_abuse_log(created_at DESC);
CREATE INDEX idx_api_abuse_log_endpoint ON public.api_abuse_log(endpoint);
CREATE INDEX idx_stripe_fraud_user_id ON public.stripe_fraud_checks(user_id);
CREATE INDEX idx_stripe_fraud_customer_id ON public.stripe_fraud_checks(stripe_customer_id);
CREATE INDEX idx_stripe_fraud_created_at ON public.stripe_fraud_checks(created_at DESC);
CREATE INDEX idx_stripe_fraud_blocked ON public.stripe_fraud_checks(is_blocked) WHERE is_blocked = true;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_api_abuse(UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_api_request(UUID, INET, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stripe_fraud(UUID, TEXT, DECIMAL, TEXT) TO authenticated;

-- Add comments
COMMENT ON TABLE public.api_abuse_log IS 'Logs API requests for abuse detection';
COMMENT ON TABLE public.stripe_fraud_checks IS 'Stores Stripe fraud detection results';
COMMENT ON FUNCTION public.check_api_abuse(UUID, INET, TEXT) IS 'Checks if API request is abusive';
COMMENT ON FUNCTION public.log_api_request(UUID, INET, TEXT, TEXT, INTEGER, INTEGER, INTEGER) IS 'Logs an API request for monitoring';
COMMENT ON FUNCTION public.check_stripe_fraud(UUID, TEXT, DECIMAL, TEXT) IS 'Checks for potential Stripe fraud';

