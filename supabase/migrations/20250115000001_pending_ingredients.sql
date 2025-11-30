-- Create pending_ingredients table for user-submitted ingredients
CREATE TABLE public.pending_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fats DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('grams', 'ml')),
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.pending_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending ingredients" 
ON public.pending_ingredients 
FOR SELECT 
USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert their own pending ingredients" 
ON public.pending_ingredients 
FOR INSERT 
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own pending ingredients" 
ON public.pending_ingredients 
FOR UPDATE 
USING (auth.uid() = submitted_by AND status = 'pending');

-- Admin policies (for future admin panel)
CREATE POLICY "Admins can view all pending ingredients" 
ON public.pending_ingredients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() 
    AND plan = 'admin'
  )
);

CREATE POLICY "Admins can update pending ingredients" 
ON public.pending_ingredients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() 
    AND plan = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pending_ingredients_updated_at
BEFORE UPDATE ON public.pending_ingredients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_pending_ingredients_status ON public.pending_ingredients(status);
CREATE INDEX idx_pending_ingredients_submitted_by ON public.pending_ingredients(submitted_by);
CREATE INDEX idx_pending_ingredients_created_at ON public.pending_ingredients(created_at);

-- Add comment explaining the table
COMMENT ON TABLE public.pending_ingredients IS 'Stores user-submitted ingredients awaiting admin approval before being added to the main ingredients database';
COMMENT ON COLUMN public.pending_ingredients.status IS 'Status of the ingredient submission: pending, approved, or rejected';
COMMENT ON COLUMN public.pending_ingredients.submitted_by IS 'User who submitted the ingredient';
COMMENT ON COLUMN public.pending_ingredients.reviewed_by IS 'Admin who reviewed the ingredient';
COMMENT ON COLUMN public.pending_ingredients.review_notes IS 'Admin notes about the review decision';
