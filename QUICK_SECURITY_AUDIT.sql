-- 🔒 QUICK DATABASE SECURITY AUDIT 🔒
-- Run these queries to verify your database security

-- ============================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- ============================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. LIST ALL ADMIN USERS
-- ============================================
SELECT 
  u.email,
  u.created_at,
  s.plan,
  s.granted_by,
  s.granted_at,
  CASE 
    WHEN s.granted_at > NOW() - INTERVAL '30 days' THEN '⚠️ RECENTLY GRANTED'
    ELSE '✅ OLD ADMIN'
  END as status
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin'
ORDER BY s.granted_at DESC;

-- ============================================
-- 3. CHECK RATE LIMITING SETUP
-- ============================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rate_limits'
    ) THEN '✅ Rate limiting table exists'
    ELSE '❌ Rate limiting table missing'
  END as rate_limiting_status;

-- ============================================
-- 4. CHECK ERROR LOGGING SETUP
-- ============================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'error_logs'
    ) THEN '✅ Error logging table exists'
    ELSE '❌ Error logging table missing'
  END as error_logging_status;

-- ============================================
-- 5. CHECK ADMIN FUNCTIONS EXIST
-- ============================================
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IN (
      'bootstrap_admin',
      'admin_make_admin',
      'admin_remove_admin',
      'admin_review_ingredient',
      'get_all_users_simple'
    ) THEN '✅ Function exists'
    ELSE '⚠️ Function missing'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%admin%'
ORDER BY routine_name;

-- ============================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  '✅ FK Constraint exists' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 7. CHECK RECENT ERRORS (Last 24 hours)
-- ============================================
SELECT 
  COUNT(*) as error_count,
  severity,
  CASE 
    WHEN COUNT(*) > 100 THEN '⚠️ HIGH ERROR COUNT'
    WHEN COUNT(*) > 50 THEN '⚠️ MODERATE ERROR COUNT'
    ELSE '✅ NORMAL'
  END as status
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY severity
ORDER BY error_count DESC;

-- ============================================
-- 8. CHECK FOR USERS WITHOUT SUBSCRIPTIONS
-- ============================================
SELECT 
  COUNT(*) as users_without_subscription
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.user_id IS NULL;

-- ============================================
-- 9. VERIFY RLS POLICIES ON KEY TABLES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_subscriptions', 'pending_ingredients', 'error_logs', 'rate_limits')
ORDER BY tablename, policyname;

-- ============================================
-- 10. SECURITY SUMMARY
-- ============================================
SELECT 
  'RLS Enabled Tables' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ GOOD'
    ELSE '⚠️ CHECK NEEDED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true

UNION ALL

SELECT 
  'Admin Users' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) BETWEEN 1 AND 5 THEN '✅ GOOD'
    WHEN COUNT(*) > 10 THEN '⚠️ TOO MANY ADMINS'
    ELSE '⚠️ CHECK NEEDED'
  END as status
FROM user_subscriptions
WHERE plan = 'admin'

UNION ALL

SELECT 
  'Security Tables' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ GOOD'
    ELSE '⚠️ MISSING TABLES'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('error_logs', 'rate_limits');

