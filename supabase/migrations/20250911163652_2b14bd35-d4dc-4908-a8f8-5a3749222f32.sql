-- Add warning columns to generated_meals table
ALTER TABLE public.generated_meals ADD COLUMN calorie_warning TEXT;
ALTER TABLE public.generated_meals ADD COLUMN macro_warning TEXT;