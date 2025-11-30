-- Admin System Migration
-- Add admin management fields to user_subscriptions table

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.admin_grant_subscription(UUID, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_revoke_subscription(UUID);
DROP FUNCTION IF EXISTS public.admin_make_admin(UUID);
DROP FUNCTION IF EXISTS public.admin_remove_admin(UUID);
DROP FUNCTION IF EXISTS public.bootstrap_admin(UUID);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage any subscription" ON public.user_subscriptions;

ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'stripe' CHECK (source IN ('stripe', 'manual')),
ADD COLUMN IF NOT EXISTS granted_by UUID,
ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create function to grant subscription (admin only)
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  target_user_uuid UUID,
  new_plan TEXT,
  days INTEGER DEFAULT NULL,
  is_lifetime BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate expiry date
  IF is_lifetime THEN
    expiry_date := NULL; -- No expiry for lifetime
  ELSIF days IS NOT NULL THEN
    expiry_date := NOW() + (days || ' days')::INTERVAL;
  ELSE
    expiry_date := NOW() + INTERVAL '1 month'; -- Default 1 month
  END IF;
  
  -- Insert or update subscription
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan, 
    source,
    subscription_status,
    current_period_end,
    subscription_expires_at,
    granted_by,
    granted_at,
    created_at,
    updated_at
  ) VALUES (
    target_user_uuid,
    new_plan,
    'manual',
    'active',
    expiry_date,
    expiry_date,
    auth.uid(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    plan = EXCLUDED.plan,
    source = 'manual',
    subscription_status = 'active',
    current_period_end = EXCLUDED.current_period_end,
    subscription_expires_at = EXCLUDED.subscription_expires_at,
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    cancellation_requested_at = NULL,
    cancellation_cancelled_at = NULL,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke subscription (admin only)
CREATE OR REPLACE FUNCTION public.admin_revoke_subscription(
  target_user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Revoke subscription (set to free)
  UPDATE public.user_subscriptions 
  SET 
    plan = 'free',
    source = 'manual',
    subscription_status = 'revoked',
    current_period_end = NOW(),
    subscription_expires_at = NOW(),
    granted_by = auth.uid(),
    granted_at = NOW(),
    cancellation_requested_at = NULL,
    cancellation_cancelled_at = NULL,
    updated_at = NOW()
  WHERE user_id = target_user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to make someone admin (admin only)
CREATE OR REPLACE FUNCTION public.admin_make_admin(
  target_user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Make user admin
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan, 
    source,
    subscription_status,
    granted_by,
    granted_at,
    created_at,
    updated_at
  ) VALUES (
    target_user_uuid,
    'admin',
    'manual',
    'active',
    auth.uid(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    plan = 'admin',
    source = 'manual',
    subscription_status = 'active',
    granted_by = auth.uid(),
    granted_at = NOW(),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove admin role (admin only)
CREATE OR REPLACE FUNCTION public.admin_remove_admin(
  target_user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Remove admin role (set to free)
  UPDATE public.user_subscriptions 
  SET 
    plan = 'free',
    source = 'manual',
    granted_by = auth.uid(),
    granted_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bootstrap function to make first admin (no admin check required)
CREATE OR REPLACE FUNCTION public.bootstrap_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Make user admin without checking if current user is admin
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan, 
    source,
    subscription_status,
    granted_by,
    granted_at,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    'admin',
    'manual',
    'active',
    user_uuid, -- Self-granted
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    plan = 'admin',
    source = 'manual',
    subscription_status = 'active',
    granted_by = user_uuid,
    granted_at = NOW(),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_grant_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_make_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin TO authenticated;

-- RLS policies
CREATE POLICY "Admins can manage any subscription" 
ON public.user_subscriptions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);
