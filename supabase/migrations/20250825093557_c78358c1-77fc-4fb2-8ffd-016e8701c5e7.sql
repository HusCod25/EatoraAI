-- Create user_activity table to track user activity metrics
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meals_generated INTEGER NOT NULL DEFAULT 0,
  saved_recipes INTEGER NOT NULL DEFAULT 0,
  weekly_meals_used INTEGER NOT NULL DEFAULT 0,
  weekly_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity" 
ON public.user_activity 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_activity_updated_at
BEFORE UPDATE ON public.user_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user_complete function to also create user activity record
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- Insert user activity with all zeros
  INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$function$;