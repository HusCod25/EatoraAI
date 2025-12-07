-- Fix rate limiting system for MunchiesAI™
-- This migration ensures the correct functions and triggers are in place

-- 1. Ensure RLS is enabled on user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist and recreate with correct names
DROP POLICY IF EXISTS "insert_own_logs" ON user_activity_log;
DROP POLICY IF EXISTS "select_own_logs" ON user_activity_log;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON user_activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON user_activity_log;

-- Create policies with user-specified names
CREATE POLICY "insert_own_logs"
ON user_activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "select_own_logs"
ON user_activity_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Drop existing functions and triggers
-- Drop triggers from both possible table names
DROP TRIGGER IF EXISTS trg_prevent_spam ON user_activity_log;
DROP TRIGGER IF EXISTS trg_prevent_spam ON user_activity;
DROP TRIGGER IF EXISTS check_rate_limit_trigger ON user_activity_log;
DROP TRIGGER IF EXISTS check_rate_limit_trigger ON user_activity;
-- Use CASCADE to drop functions and their dependent triggers
DROP FUNCTION IF EXISTS prevent_spam() CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit_before_insert() CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(uuid, text) CASCADE;

-- 4. Create check_rate_limit function (user-specified)
CREATE OR REPLACE FUNCTION check_rate_limit(p_user uuid, p_action text)
RETURNS boolean AS $$
DECLARE
  count_recent int;
BEGIN
  SELECT COUNT(*) INTO count_recent
  FROM user_activity_log
  WHERE user_id = p_user
    AND action = p_action
    AND created_at > now() - interval '1 minute';

  IF count_recent > 5 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create prevent_spam function (user-specified)
CREATE OR REPLACE FUNCTION prevent_spam()
RETURNS trigger AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, NEW.action) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait a bit.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger (user-specified)
CREATE TRIGGER trg_prevent_spam
BEFORE INSERT ON user_activity_log
FOR EACH ROW EXECUTE FUNCTION prevent_spam();

