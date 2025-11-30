-- FIX 7 — Ingredient System Optimization
-- Clean ingredients, unit conversions, duplicate handling

-- 1. Create function to normalize ingredient names (remove duplicates, clean data)
CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(ingredient_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Convert to lowercase
  ingredient_name := LOWER(TRIM(ingredient_name));
  
  -- Remove common prefixes/suffixes
  ingredient_name := REGEXP_REPLACE(ingredient_name, '^(fresh|dried|frozen|canned|organic|raw|cooked)\s+', '', 'gi');
  ingredient_name := REGEXP_REPLACE(ingredient_name, '\s+(fresh|dried|frozen|canned|organic|raw|cooked)$', '', 'gi');
  
  -- Remove extra whitespace
  ingredient_name := REGEXP_REPLACE(ingredient_name, '\s+', ' ', 'g');
  
  -- Remove leading/trailing spaces
  ingredient_name := TRIM(ingredient_name);
  
  RETURN ingredient_name;
END;
$$;

-- 2. Create function to find duplicate ingredients
CREATE OR REPLACE FUNCTION public.find_duplicate_ingredients()
RETURNS TABLE (
  normalized_name TEXT,
  duplicate_ids UUID[],
  duplicate_names TEXT[],
  count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT 
      id,
      name,
      public.normalize_ingredient_name(name) AS normalized_name
    FROM public."Ingredients"
  ),
  grouped AS (
    SELECT 
      normalized_name,
      ARRAY_AGG(id) AS ids,
      ARRAY_AGG(name) AS names,
      COUNT(*) AS cnt
    FROM normalized
    GROUP BY normalized_name
    HAVING COUNT(*) > 1
  )
  SELECT 
    grouped.normalized_name,
    grouped.ids,
    grouped.names,
    grouped.cnt
  FROM grouped
  ORDER BY grouped.cnt DESC;
END;
$$;

-- 3. Create function to merge duplicate ingredients
CREATE OR REPLACE FUNCTION public.merge_duplicate_ingredients(
  keep_id UUID,
  merge_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merged_count INTEGER := 0;
  merge_id UUID;
  avg_calories DECIMAL;
  avg_protein DECIMAL;
  avg_carbs DECIMAL;
  avg_fat DECIMAL;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can merge ingredients';
  END IF;
  
  -- Calculate averages for nutritional values
  SELECT 
    AVG(calories),
    AVG(protein),
    AVG(carbs),
    AVG(fat)
  INTO avg_calories, avg_protein, avg_carbs, avg_fat
  FROM public."Ingredients"
  WHERE id = ANY(merge_ids || ARRAY[keep_id]);
  
  -- Update the kept ingredient with averaged values
  UPDATE public."Ingredients"
  SET 
    calories = COALESCE(avg_calories, calories),
    protein = COALESCE(avg_protein, protein),
    carbs = COALESCE(avg_carbs, carbs),
    fat = COALESCE(avg_fat, fat),
    name = public.normalize_ingredient_name(name)
  WHERE id = keep_id;
  
  -- Delete merged ingredients
  DELETE FROM public."Ingredients"
  WHERE id = ANY(merge_ids);
  
  GET DIAGNOSTICS merged_count = ROW_COUNT;
  
  RETURN merged_count;
END;
$$;

-- 4. Create function to clean all ingredient names
CREATE OR REPLACE FUNCTION public.clean_all_ingredient_names()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can clean ingredients';
  END IF;
  
  -- Normalize all ingredient names
  UPDATE public."Ingredients"
  SET name = public.normalize_ingredient_name(name)
  WHERE name != public.normalize_ingredient_name(name);
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- 5. Create unit conversion helper function
CREATE OR REPLACE FUNCTION public.convert_unit_to_grams(
  quantity DECIMAL,
  unit_name TEXT,
  ingredient_name TEXT DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  converted_quantity DECIMAL;
BEGIN
  -- Convert to lowercase for comparison
  unit_name := LOWER(TRIM(unit_name));
  
  -- Unit conversions to grams
  CASE unit_name
    WHEN 'kg' THEN converted_quantity := quantity * 1000;
    WHEN 'g' OR 'grams' OR 'gram' THEN converted_quantity := quantity;
    WHEN 'mg' THEN converted_quantity := quantity / 1000;
    WHEN 'oz' OR 'ounces' OR 'ounce' THEN converted_quantity := quantity * 28.35;
    WHEN 'lb' OR 'pounds' OR 'pound' THEN converted_quantity := quantity * 453.592;
    WHEN 'ml' OR 'milliliters' OR 'milliliter' THEN converted_quantity := quantity; -- Approximate for liquids
    WHEN 'l' OR 'liters' OR 'liter' OR 'litres' OR 'litre' THEN converted_quantity := quantity * 1000;
    WHEN 'tbsp' OR 'tablespoon' OR 'tablespoons' THEN converted_quantity := quantity * 15; -- Approximate
    WHEN 'tsp' OR 'teaspoon' OR 'teaspoons' THEN converted_quantity := quantity * 5; -- Approximate
    WHEN 'cup' OR 'cups' THEN converted_quantity := quantity * 240; -- Approximate
    WHEN 'pieces' OR 'piece' OR 'pcs' OR 'pc' THEN
      -- For pieces, use ingredient-specific conversions if available
      IF ingredient_name IS NOT NULL THEN
        CASE LOWER(ingredient_name)
          WHEN 'onion' OR 'onions' THEN converted_quantity := quantity * 100;
          WHEN 'egg' OR 'eggs' THEN converted_quantity := quantity * 50;
          WHEN 'apple' OR 'apples' THEN converted_quantity := quantity * 150;
          WHEN 'banana' OR 'bananas' THEN converted_quantity := quantity * 120;
          WHEN 'tomato' OR 'tomatoes' THEN converted_quantity := quantity * 100;
          WHEN 'potato' OR 'potatoes' THEN converted_quantity := quantity * 150;
          WHEN 'carrot' OR 'carrots' THEN converted_quantity := quantity * 75;
          WHEN 'lemon' OR 'lemons' THEN converted_quantity := quantity * 60;
          WHEN 'orange' OR 'oranges' THEN converted_quantity := quantity * 150;
          WHEN 'avocado' OR 'avocados' THEN converted_quantity := quantity * 200;
          ELSE converted_quantity := quantity * 100; -- Default for pieces
        END CASE;
      ELSE
        converted_quantity := quantity * 100; -- Default for pieces
      END IF;
    ELSE
      -- Unknown unit, assume grams
      converted_quantity := quantity;
  END CASE;
  
  RETURN converted_quantity;
END;
$$;

-- 6. Create function to validate ingredient data
CREATE OR REPLACE FUNCTION public.validate_ingredient_data(
  p_name TEXT,
  p_calories DECIMAL,
  p_protein DECIMAL,
  p_carbs DECIMAL,
  p_fat DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  validation_result JSONB;
  errors TEXT[] := ARRAY[]::TEXT[];
  calculated_calories DECIMAL;
  calorie_difference DECIMAL;
BEGIN
  -- Validate name
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    errors := array_append(errors, 'Ingredient name is required');
  END IF;
  
  -- Validate nutritional values are not negative
  IF p_calories < 0 OR p_protein < 0 OR p_carbs < 0 OR p_fat < 0 THEN
    errors := array_append(errors, 'Nutritional values cannot be negative');
  END IF;
  
  -- Validate calorie calculation (protein*4 + carbs*4 + fat*9)
  calculated_calories := (COALESCE(p_protein, 0) * 4) + (COALESCE(p_carbs, 0) * 4) + (COALESCE(p_fat, 0) * 9);
  calorie_difference := ABS(calculated_calories - COALESCE(p_calories, 0));
  
  -- Allow 10% difference for rounding
  IF calorie_difference > (calculated_calories * 0.1) AND calculated_calories > 0 THEN
    errors := array_append(errors, format('Calorie calculation mismatch: expected ~%.0f, got %.0f', calculated_calories, p_calories));
  END IF;
  
  -- Build result
  validation_result := jsonb_build_object(
    'is_valid', array_length(errors, 1) IS NULL,
    'errors', errors,
    'calculated_calories', calculated_calories,
    'calorie_difference', calorie_difference
  );
  
  RETURN validation_result;
END;
$$;

-- 7. Add unique constraint on normalized ingredient names (with index)
-- Use dynamic SQL for case-sensitive table name
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredients') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ingredients_normalized_name ON public."Ingredients"(public.normalize_ingredient_name(name))';
  END IF;
END $$;

-- 8. Create trigger to auto-normalize ingredient names on insert/update
CREATE OR REPLACE FUNCTION public.auto_normalize_ingredient_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := public.normalize_ingredient_name(NEW.name);
  RETURN NEW;
END;
$$;

-- Use dynamic SQL for case-sensitive table name
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredients') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_normalize_ingredient_name ON public."Ingredients"';
    EXECUTE 'CREATE TRIGGER trg_normalize_ingredient_name BEFORE INSERT OR UPDATE ON public."Ingredients" FOR EACH ROW EXECUTE FUNCTION public.auto_normalize_ingredient_name()';
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.normalize_ingredient_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_ingredients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_ingredients(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_all_ingredient_names() TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_unit_to_grams(DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ingredient_data(TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.normalize_ingredient_name(TEXT) IS 'Normalizes ingredient names by removing prefixes, converting to lowercase, etc.';
COMMENT ON FUNCTION public.find_duplicate_ingredients() IS 'Finds duplicate ingredients based on normalized names';
COMMENT ON FUNCTION public.merge_duplicate_ingredients(UUID, UUID[]) IS 'Merges duplicate ingredients into one. Admin only.';
COMMENT ON FUNCTION public.clean_all_ingredient_names() IS 'Cleans all ingredient names in the database. Admin only.';
COMMENT ON FUNCTION public.convert_unit_to_grams(DECIMAL, TEXT, TEXT) IS 'Converts various units to grams for consistent calculations';
COMMENT ON FUNCTION public.validate_ingredient_data(TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Validates ingredient data for consistency';

