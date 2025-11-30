-- Admin Ingredient Review Function
-- Creates secure server-side function for admins to approve/reject ingredients

-- Create function to review ingredient (admin only)
CREATE OR REPLACE FUNCTION public.admin_review_ingredient(
  ingredient_id UUID,
  review_action TEXT, -- 'approve' or 'reject'
  review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  ingredient_record RECORD;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Validate review action
  IF review_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid review action. Must be "approve" or "reject"';
  END IF;
  
  -- Get the pending ingredient
  SELECT * INTO ingredient_record
  FROM public.pending_ingredients
  WHERE id = ingredient_id;
  
  -- Check if ingredient exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;
  
  -- Check if already reviewed
  IF ingredient_record.status != 'pending' THEN
    RAISE EXCEPTION 'Ingredient has already been reviewed';
  END IF;
  
  -- Update the pending ingredient
  UPDATE public.pending_ingredients
  SET 
    status = review_action || 'd', -- 'approved' or 'rejected'
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = review_notes,
    updated_at = NOW()
  WHERE id = ingredient_id;
  
  -- If approved, add to main Ingredients table
  IF review_action = 'approve' THEN
    -- Check if ingredient already exists in main table
    IF NOT EXISTS (
      SELECT 1 FROM public."Ingredients"
      WHERE LOWER(name) = LOWER(ingredient_record.name)
    ) THEN
      INSERT INTO public."Ingredients" (
        name,
        calories,
        protein,
        carbs,
        fat,
        unit,
        category
      ) VALUES (
        ingredient_record.name,
        ingredient_record.calories,
        ingredient_record.protein,
        ingredient_record.carbs,
        ingredient_record.fats,
        ingredient_record.unit,
        ingredient_record.category
      );
    ELSE
      -- Ingredient already exists, log warning (but still mark as approved)
      RAISE WARNING 'Ingredient "%" already exists in main database', ingredient_record.name;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (the function will check admin status internally)
GRANT EXECUTE ON FUNCTION public.admin_review_ingredient(UUID, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.admin_review_ingredient IS 'Allows admins to approve or reject pending ingredient submissions. Verifies admin access server-side.';

