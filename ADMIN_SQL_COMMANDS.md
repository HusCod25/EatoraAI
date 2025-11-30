# Admin SQL Commands Reference

## 🚀 Quick Setup (Run These First)

### 1. Apply the Migration
```sql
-- Run this in Supabase SQL Editor                                   
-- This creates all the admin functions and tables
-- File: supabase/migrations/20250115000003_admin_system.sql
```

### 2. Make Yourself Admin (Bootstrap)
```sql
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can find your user ID in the Supabase dashboard under Authentication > Users
SELECT setup_first_admin('YOUR_USER_ID'::uuid);
```

## 📋 All Available Admin Functions

### 1. Grant Subscription to User
```sql
-- Grant a subscription to any user
SELECT grant_user_subscription(
  'USER_ID'::uuid,           -- Target user's ID
  'unlimited',               -- Plan: 'beginner', 'chef', 'unlimited'
  30,                        -- Duration in days (or NULL for default)
  false                      -- Is lifetime? (true/false)
);

-- Examples:
-- Grant 30-day unlimited plan
SELECT grant_user_subscription('123e4567-e89b-12d3-a456-426614174000'::uuid, 'unlimited', 30, false);

-- Grant lifetime chef plan
SELECT grant_user_subscription('123e4567-e89b-12d3-a456-426614174000'::uuid, 'chef', NULL, true);

-- Grant 1-year beginner plan
SELECT grant_user_subscription('123e4567-e89b-12d3-a456-426614174000'::uuid, 'beginner', 365, false);
```

### 2. Revoke User's Subscription
```sql
-- Revoke subscription (sets user back to free plan)
SELECT revoke_user_subscription('USER_ID'::uuid);

-- Example:
SELECT revoke_user_subscription('123e4567-e89b-12d3-a456-426614174000'::uuid);
```

### 3. Make User Admin
```sql
-- Grant admin privileges to a user
SELECT grant_admin_role('USER_ID'::uuid);

-- Example:
SELECT grant_admin_role('123e4567-e89b-12d3-a456-426614174000'::uuid);
```

### 4. Remove Admin Role
```sql
-- Remove admin privileges (sets user back to free plan)
SELECT remove_admin_role('USER_ID'::uuid);

-- Example:
SELECT remove_admin_role('123e4567-e89b-12d3-a456-426614174000'::uuid);
```

### 5. Bootstrap Admin (First Time Setup)
```sql
-- Make someone admin without requiring admin privileges
-- Use this only for the first admin setup
SELECT setup_first_admin('USER_ID'::uuid);

-- Example:
SELECT setup_first_admin('123e4567-e89b-12d3-a456-426614174000'::uuid);
```

## 🔍 Useful Queries

### Find User ID by Email
```sql
-- Get user ID from email address
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

### List All Users with Subscriptions
```sql
-- See all users and their subscription status
SELECT 
  u.email,
  u.created_at,
  s.plan,
  s.source,
  s.subscription_status,
  s.current_period_end,
  s.granted_by,
  s.granted_at
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
ORDER BY u.created_at DESC;
```

### List All Admins
```sql
-- Find all users with admin privileges
SELECT 
  u.email,
  s.granted_by,
  s.granted_at
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin';
```

### Check User's Current Status
```sql
-- Check specific user's subscription details
SELECT 
  u.email,
  s.plan,
  s.source,
  s.subscription_status,
  s.current_period_end,
  s.cancellation_requested_at,
  s.granted_by,
  s.granted_at
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';
```

## 🎯 Common Use Cases

### Give Someone a Free Month
```sql
-- Grant 30-day unlimited plan
SELECT grant_user_subscription('USER_ID'::uuid, 'unlimited', 30, false);
```

### Give Someone Lifetime Access
```sql
-- Grant lifetime unlimited plan
SELECT grant_user_subscription('USER_ID'::uuid, 'unlimited', NULL, true);
```

### Make Someone Admin
```sql
-- Grant admin privileges
SELECT grant_admin_role('USER_ID'::uuid);
```

### Remove Someone's Access
```sql
-- Revoke subscription (back to free)
SELECT revoke_user_subscription('USER_ID'::uuid);
```

### Gift a Year of Chef Plan
```sql
-- Grant 365-day chef plan
SELECT grant_user_subscription('USER_ID'::uuid, 'chef', 365, false);
```

## 🛠️ Troubleshooting

### Function Returns False
- **Problem**: Admin function returns `false`
- **Solution**: Make sure you have admin privileges first
- **Check**: Run `SELECT plan FROM user_subscriptions WHERE user_id = auth.uid();`
- **Fix**: Use `setup_first_admin()` if you're the first admin

### User Not Found
- **Problem**: "User not found" error
- **Solution**: Check the user ID exists in `auth.users`
- **Query**: `SELECT id, email FROM auth.users WHERE email = 'user@example.com';`

### Permission Denied
- **Problem**: "Permission denied" error
- **Solution**: Make sure you're logged in and have admin privileges
- **Check**: Verify your user ID has `plan = 'admin'` in `user_subscriptions`

## 📱 Using the Web Interface

### Access Admin Panel
1. Go to your app
2. Click your profile/account button
3. Click "Users" button (only visible to admins)
4. Or navigate directly to `/admin/users`

### Grant Subscription via Web
1. Go to Admin Users page
2. Find the user in the table
3. Click the "..." menu next to their name
4. Select "Grant Subscription"
5. Choose plan and duration
6. Click "Grant Subscription"

### Make Someone Admin via Web
1. Go to Admin Users page
2. Find the user in the table
3. Click the "..." menu next to their name
4. Select "Make Admin"

## 🔐 Security Notes

- All admin functions check if the current user has admin privileges
- Only admins can grant/revoke subscriptions
- Only admins can make/remove other admins
- Use `bootstrap_admin()` only for initial setup
- All manual grants are marked with `source = 'manual'`
- Users cannot cancel admin-granted subscriptions

## 📊 Plan Types

- **free**: No subscription (default)
- **beginner**: Basic paid plan
- **chef**: Advanced paid plan  
- **unlimited**: Premium paid plan
- **admin**: Full admin access

## 🎁 Source Types

- **stripe**: Paid via Stripe (users can cancel)
- **manual**: Admin-granted (users cannot cancel)

---

**Need Help?** 
- Check the Supabase logs for detailed error messages
- Verify user IDs exist in `auth.users` table
- Make sure you have admin privileges before running admin functions
