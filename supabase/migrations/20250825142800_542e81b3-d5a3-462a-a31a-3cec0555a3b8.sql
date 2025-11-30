-- Add macronutrient columns to generated_meals table
ALTER TABLE generated_meals 
ADD COLUMN protein integer DEFAULT 0,
ADD COLUMN carbs integer DEFAULT 0, 
ADD COLUMN fats integer DEFAULT 0;

-- Add macronutrient columns to saved_meals table  
ALTER TABLE saved_meals
ADD COLUMN protein integer DEFAULT 0,
ADD COLUMN carbs integer DEFAULT 0,
ADD COLUMN fats integer DEFAULT 0;