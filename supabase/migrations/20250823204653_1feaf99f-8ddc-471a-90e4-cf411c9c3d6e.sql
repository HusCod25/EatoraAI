-- Create generated_meals table (temporary meals, auto-deleted after 24h)
CREATE TABLE public.generated_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL, -- Array of {name, weight, unit}
  preparation_method TEXT NOT NULL,
  cooking_time INTEGER, -- in minutes
  calories INTEGER,
  tags TEXT[], -- Array of tags like 'Healthy', 'Vegetarian', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Create saved_meals table (permanent saved meals)
CREATE TABLE public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL, -- Array of {name, weight, unit}
  preparation_method TEXT NOT NULL,
  cooking_time INTEGER, -- in minutes
  calories INTEGER,
  tags TEXT[], -- Array of tags like 'Healthy', 'Vegetarian', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_from_generated_id UUID -- Reference to original generated meal if applicable
);

-- Enable Row Level Security
ALTER TABLE public.generated_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_meals
CREATE POLICY "Users can view their own generated meals" 
ON public.generated_meals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated meals" 
ON public.generated_meals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated meals" 
ON public.generated_meals 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for saved_meals
CREATE POLICY "Users can view their own saved meals" 
ON public.saved_meals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved meals" 
ON public.saved_meals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved meals" 
ON public.saved_meals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved meals" 
ON public.saved_meals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_generated_meals_user_id ON public.generated_meals(user_id);
CREATE INDEX idx_generated_meals_expires_at ON public.generated_meals(expires_at);
CREATE INDEX idx_saved_meals_user_id ON public.saved_meals(user_id);

-- Create function to clean up expired generated meals
CREATE OR REPLACE FUNCTION public.cleanup_expired_generated_meals()
RETURNS void AS $$
BEGIN
  DELETE FROM public.generated_meals 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;