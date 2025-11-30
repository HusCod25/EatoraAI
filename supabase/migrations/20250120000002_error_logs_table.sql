-- Error Logs Table
-- Stores client-side errors for monitoring and debugging

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pathname TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own errors
CREATE POLICY "Users can view their own errors" 
ON public.error_logs 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Allow authenticated users to insert errors
CREATE POLICY "Users can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (true);

-- Admins can view all errors
CREATE POLICY "Admins can view all errors" 
ON public.error_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_pathname ON public.error_logs(pathname);

-- Add comments
COMMENT ON TABLE public.error_logs IS 'Stores client-side errors for monitoring and debugging during beta testing';
COMMENT ON COLUMN public.error_logs.severity IS 'Error severity level: error, warning, or info';
COMMENT ON COLUMN public.error_logs.context IS 'Additional context about the error (JSON object)';

