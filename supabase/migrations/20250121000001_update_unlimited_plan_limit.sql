-- Migration: Update Unlimited Plan to 500 meals per week
-- This changes the unlimited plan from NULL to 500 meals per week

-- Update the unlimited plan to have 500 meals per week
UPDATE public.plan_limits
SET meals_per_week = 500
WHERE plan = 'unlimited';

-- If the unlimited plan doesn't exist, insert it with 500 meals
INSERT INTO public.plan_limits (plan, meals_per_week, max_ingredients, max_saved_meals, has_advanced_recipes, has_personalized_suggestions, has_personalized_themes)
VALUES ('unlimited', 500, NULL, NULL, true, true, true)
ON CONFLICT (plan) DO UPDATE
SET meals_per_week = 500;

-- Add comment
COMMENT ON COLUMN public.plan_limits.meals_per_week IS 'Number of meals allowed per week. NULL means unlimited (not used currently).';

