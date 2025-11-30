-- Create subscription plans enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'beginner', 'chef', 'unlimited');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to automatically create free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to also create subscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Insert subscription
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- Create updated_at trigger for subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create plan limits table for feature enforcement
CREATE TABLE public.plan_limits (
  plan subscription_plan PRIMARY KEY,
  meals_per_week INTEGER NOT NULL,
  max_ingredients INTEGER, -- NULL means unlimited
  max_saved_meals INTEGER, -- NULL means unlimited
  has_advanced_recipes BOOLEAN NOT NULL DEFAULT false,
  has_personalized_suggestions BOOLEAN NOT NULL DEFAULT false,
  has_personalized_themes BOOLEAN NOT NULL DEFAULT false
);

-- Insert plan limits
INSERT INTO public.plan_limits (plan, meals_per_week, max_ingredients, max_saved_meals, has_advanced_recipes, has_personalized_suggestions, has_personalized_themes) VALUES
('free', 10, 6, 3, false, false, false),
('beginner', 40, NULL, 20, true, false, false),
('chef', 80, NULL, NULL, true, true, false),
('unlimited', NULL, NULL, NULL, true, true, true);

-- Enable RLS on plan_limits (public read access)
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan limits are publicly readable" 
ON public.plan_limits 
FOR SELECT 
USING (true);