-- Update saved meal limits for each plan
UPDATE public.plan_limits 
SET max_saved_meals = 15 
WHERE plan = 'beginner';

UPDATE public.plan_limits 
SET max_saved_meals = 35 
WHERE plan = 'chef';

UPDATE public.plan_limits 
SET max_saved_meals = 100 
WHERE plan = 'unlimited';