-- FIX 5 — Backup & Data Integrity
-- System backup tables + restore data functions

-- Create backup tables for critical data
CREATE TABLE IF NOT EXISTS public.backup_profiles (
  backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.backup_user_subscriptions (
  backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.backup_user_activity (
  backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meals_generated INTEGER,
  saved_recipes INTEGER,
  weekly_meals_used INTEGER,
  weekly_reset_date DATE,
  subscription_cycle_start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.backup_generated_meals (
  backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  ingredients JSONB,
  preparation_method TEXT,
  cooking_time INTEGER,
  calories INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL
);

-- Enable RLS on backup tables
ALTER TABLE public.backup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_generated_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backup tables (only admins can view)
CREATE POLICY "Admins can view backup_profiles" 
ON public.backup_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

CREATE POLICY "Admins can view backup_user_subscriptions" 
ON public.backup_user_subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

CREATE POLICY "Admins can view backup_user_activity" 
ON public.backup_user_activity 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

CREATE POLICY "Admins can view backup_generated_meals" 
ON public.backup_generated_meals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

-- Function to backup profiles
CREATE OR REPLACE FUNCTION public.backup_profiles_table()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_count INTEGER;
BEGIN
  INSERT INTO public.backup_profiles (user_id, username, original_data)
  SELECT 
    user_id,
    username,
    row_to_json(p)::jsonb
  FROM public.profiles p;
  
  GET DIAGNOSTICS backup_count = ROW_COUNT;
  RETURN backup_count;
END;
$$;

-- Function to backup user_subscriptions
CREATE OR REPLACE FUNCTION public.backup_user_subscriptions_table()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_count INTEGER;
BEGIN
  INSERT INTO public.backup_user_subscriptions (
    user_id, plan, stripe_customer_id, stripe_subscription_id,
    subscription_status, current_period_end, original_data
  )
  SELECT 
    user_id,
    plan::text,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    current_period_end,
    row_to_json(us)::jsonb
  FROM public.user_subscriptions us;
  
  GET DIAGNOSTICS backup_count = ROW_COUNT;
  RETURN backup_count;
END;
$$;

-- Function to backup user_activity
CREATE OR REPLACE FUNCTION public.backup_user_activity_table()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_count INTEGER;
BEGIN
  INSERT INTO public.backup_user_activity (
    user_id, meals_generated, saved_recipes, weekly_meals_used,
    weekly_reset_date, subscription_cycle_start_date, original_data
  )
  SELECT 
    user_id,
    meals_generated,
    saved_recipes,
    weekly_meals_used,
    weekly_reset_date,
    subscription_cycle_start_date,
    row_to_json(ua)::jsonb
  FROM public.user_activity ua;
  
  GET DIAGNOSTICS backup_count = ROW_COUNT;
  RETURN backup_count;
END;
$$;

-- Function to backup generated_meals
CREATE OR REPLACE FUNCTION public.backup_generated_meals_table()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_count INTEGER;
BEGIN
  INSERT INTO public.backup_generated_meals (
    meal_id, user_id, title, description, ingredients,
    preparation_method, cooking_time, calories, tags, original_data
  )
  SELECT 
    id,
    user_id,
    title,
    description,
    ingredients,
    preparation_method,
    cooking_time,
    calories,
    tags,
    row_to_json(gm)::jsonb
  FROM public.generated_meals gm;
  
  GET DIAGNOSTICS backup_count = ROW_COUNT;
  RETURN backup_count;
END;
$$;

-- Function to backup all critical tables
CREATE OR REPLACE FUNCTION public.backup_all_critical_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  profiles_count INTEGER;
  subscriptions_count INTEGER;
  activity_count INTEGER;
  meals_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create backups';
  END IF;
  
  -- Perform backups
  SELECT public.backup_profiles_table() INTO profiles_count;
  SELECT public.backup_user_subscriptions_table() INTO subscriptions_count;
  SELECT public.backup_user_activity_table() INTO activity_count;
  SELECT public.backup_generated_meals_table() INTO meals_count;
  
  -- Return summary
  result := jsonb_build_object(
    'profiles_backed_up', profiles_count,
    'subscriptions_backed_up', subscriptions_count,
    'activity_backed_up', activity_count,
    'meals_backed_up', meals_count,
    'backup_timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Function to restore profile from backup
CREATE OR REPLACE FUNCTION public.restore_profile_from_backup(backup_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_data JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can restore backups';
  END IF;
  
  -- Get backup data
  SELECT original_data INTO backup_data
  FROM public.backup_profiles
  WHERE backup_id = backup_uuid;
  
  IF backup_data IS NULL THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;
  
  -- Restore profile
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    (backup_data->>'user_id')::uuid,
    backup_data->>'username'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET username = EXCLUDED.username;
  
  RETURN TRUE;
END;
$$;

-- Function to restore subscription from backup
CREATE OR REPLACE FUNCTION public.restore_subscription_from_backup(backup_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_data JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can restore backups';
  END IF;
  
  -- Get backup data
  SELECT original_data INTO backup_data
  FROM public.backup_user_subscriptions
  WHERE backup_id = backup_uuid;
  
  IF backup_data IS NULL THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;
  
  -- Restore subscription
  INSERT INTO public.user_subscriptions (
    user_id, plan, stripe_customer_id, stripe_subscription_id,
    subscription_status, current_period_end
  )
  VALUES (
    (backup_data->>'user_id')::uuid,
    (backup_data->>'plan')::subscription_plan,
    backup_data->>'stripe_customer_id',
    backup_data->>'stripe_subscription_id',
    backup_data->>'subscription_status',
    (backup_data->>'current_period_end')::timestamptz
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    plan = EXCLUDED.plan,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    subscription_status = EXCLUDED.subscription_status,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions to admins
GRANT EXECUTE ON FUNCTION public.backup_all_critical_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_profile_from_backup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_subscription_from_backup(UUID) TO authenticated;

-- Create indexes for backup tables
CREATE INDEX idx_backup_profiles_user_id ON public.backup_profiles(user_id);
CREATE INDEX idx_backup_profiles_timestamp ON public.backup_profiles(backup_timestamp DESC);
CREATE INDEX idx_backup_subscriptions_user_id ON public.backup_user_subscriptions(user_id);
CREATE INDEX idx_backup_subscriptions_timestamp ON public.backup_user_subscriptions(backup_timestamp DESC);
CREATE INDEX idx_backup_activity_user_id ON public.backup_user_activity(user_id);
CREATE INDEX idx_backup_activity_timestamp ON public.backup_user_activity(backup_timestamp DESC);
CREATE INDEX idx_backup_meals_meal_id ON public.backup_generated_meals(meal_id);
CREATE INDEX idx_backup_meals_timestamp ON public.backup_generated_meals(backup_timestamp DESC);

-- Add comments
COMMENT ON TABLE public.backup_profiles IS 'Backup table for profiles - stores historical snapshots';
COMMENT ON TABLE public.backup_user_subscriptions IS 'Backup table for user subscriptions - stores historical snapshots';
COMMENT ON TABLE public.backup_user_activity IS 'Backup table for user activity - stores historical snapshots';
COMMENT ON TABLE public.backup_generated_meals IS 'Backup table for generated meals - stores historical snapshots';
COMMENT ON FUNCTION public.backup_all_critical_tables() IS 'Creates backups of all critical tables. Admin only.';
COMMENT ON FUNCTION public.restore_profile_from_backup(UUID) IS 'Restores a profile from backup. Admin only.';
COMMENT ON FUNCTION public.restore_subscription_from_backup(UUID) IS 'Restores a subscription from backup. Admin only.';

