-- ⚡ QUICK ADMIN GRANT COMMANDS ⚡
-- Copy-paste ready SQL commands for granting admin roles

-- ============================================
-- METHOD 1: GRANT ADMIN BY EMAIL (EASIEST)
-- ============================================
-- Just replace 'user@example.com' with the actual email

-- Grant admin role
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'user@example.com')::uuid
);

-- Verify it worked
SELECT email, plan, granted_at 
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE email = 'user@example.com';

-- ============================================
-- METHOD 2: FIND USER UUID FIRST, THEN GRANT
-- ============================================

-- Step 1: Find user UUID
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- Step 2: Grant admin (replace UUID_HERE with actual UUID)
SELECT bootstrap_admin('UUID_HERE'::uuid);

-- ============================================
-- HELPER COMMANDS
-- ============================================

-- List all current admins
SELECT 
  u.email,
  s.plan,
  s.granted_at
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin'
ORDER BY s.granted_at DESC;

-- Check if specific user is admin
SELECT 
  u.email,
  CASE 
    WHEN s.plan = 'admin' THEN '✅ Admin'
    ELSE '❌ Not Admin'
  END as status
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';

-- Remove admin role from user
UPDATE user_subscriptions 
SET plan = 'free',
    granted_by = (SELECT id FROM auth.users WHERE email = 'admin-email@example.com'),
    granted_at = NOW(),
    updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);

-- ============================================
-- EXAMPLES (Copy-paste and modify)
-- ============================================

-- Example 1: Grant admin to john@gmail.com
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'john@gmail.com')::uuid
);

-- Example 2: Grant admin to sarah@company.com
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'sarah@company.com')::uuid
);

-- Example 3: Grant admin to your own account
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com')::uuid
);

