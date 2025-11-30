# Admin Role Management Commands

Quick reference guide for granting and managing admin roles in chompsy.ai.

## 📋 Table of Contents

1. [Method 1: Using Email (Easiest)](#method-1-using-email-easiest)
2. [Method 2: Using User UUID](#method-2-using-user-uuid)
3. [Method 3: Bootstrap Admin (First Admin Only)](#method-3-bootstrap-admin-first-admin-only)
4. [Method 4: Direct SQL Insert](#method-4-direct-sql-insert)
5. [Helper Commands](#helper-commands)

---

## Method 1: Using Email (Easiest) ⭐ **RECOMMENDED**

**Name**: `grant_admin_by_email`

### Grant Admin Role by Email:
```sql
-- First, get the user UUID from their email
WITH user_data AS (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
)
SELECT bootstrap_admin(id) FROM user_data;
```

### One-Liner Version:
```sql
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'user@example.com')::uuid
);
```

**Example:**
```sql
-- Grant admin to someone@gmail.com
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'someone@gmail.com')::uuid
);
```

**To verify it worked:**
```sql
SELECT email, plan, granted_at 
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE email = 'someone@gmail.com';
```

---

## Method 2: Using User UUID

**Function Name**: `bootstrap_admin(user_uuid UUID)`

### Step 1: Find User UUID by Email
```sql
-- Find user UUID from email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

### Step 2: Grant Admin Using UUID
```sql
-- Replace 'USER_UUID_HERE' with the UUID from step 1
SELECT bootstrap_admin('USER_UUID_HERE'::uuid);
```

**Example:**
```sql
-- Step 1: Find UUID
SELECT id FROM auth.users WHERE email = 'admin@chompsy.ai';
-- Returns: 123e4567-e89b-12d3-a456-426614174000

-- Step 2: Grant admin
SELECT bootstrap_admin('123e4567-e89b-12d3-a456-426614174000'::uuid);
```

---

## Method 3: Bootstrap Admin (First Admin Only)

**Function Name**: `bootstrap_admin(user_uuid UUID)`

**When to use**: Creating the **FIRST** admin user when no admins exist yet.

```sql
-- Get your own user UUID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Then grant yourself admin
SELECT bootstrap_admin('YOUR_UUID_HERE'::uuid);
```

**Note**: This function doesn't require admin access, so use it only for the first admin!

---

## Method 4: Direct SQL Insert (Manual Method)

**When to use**: If functions aren't available or you need more control.

### Option A: If user already has a subscription
```sql
-- Update existing subscription to admin
UPDATE user_subscriptions 
SET 
  plan = 'admin',
  source = 'manual',
  subscription_status = 'active',
  granted_by = (SELECT id FROM auth.users WHERE email = 'their-email@example.com'),
  granted_at = NOW(),
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'their-email@example.com'
);
```

### Option B: If user has no subscription record
```sql
-- Insert new admin subscription
INSERT INTO user_subscriptions (
  user_id,
  plan,
  source,
  subscription_status,
  granted_by,
  granted_at,
  created_at,
  updated_at
)
SELECT 
  id,
  'admin',
  'manual',
  'active',
  id, -- Self-granted
  NOW(),
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'their-email@example.com';
```

---

## Helper Commands

### 🔍 Find User UUID by Email
```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

### 📋 List All Admins
```sql
SELECT 
  u.email,
  s.plan,
  s.granted_by,
  s.granted_at,
  s.updated_at
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin'
ORDER BY s.granted_at DESC;
```

### ✅ Verify User is Admin
```sql
SELECT 
  u.email,
  s.plan,
  CASE 
    WHEN s.plan = 'admin' THEN '✅ Admin'
    ELSE '❌ Not Admin'
  END as status
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';
```

### 🗑️ Remove Admin Role
```sql
-- Option 1: Using function (if you're admin)
SELECT admin_remove_admin(
  (SELECT id FROM auth.users WHERE email = 'user@example.com')::uuid
);

-- Option 2: Direct SQL
UPDATE user_subscriptions 
SET plan = 'free',
    granted_by = (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
    granted_at = NOW(),
    updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

### 📊 Check All Users and Their Plans
```sql
SELECT 
  u.email,
  COALESCE(s.plan, 'free') as plan,
  s.source,
  s.subscription_status,
  u.created_at
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
ORDER BY u.created_at DESC;
```

---

## 🎯 Quick Copy-Paste Template

**Most common use case - Grant admin by email:**

```sql
-- Replace 'someone@example.com' with the actual email
SELECT bootstrap_admin(
  (SELECT id FROM auth.users WHERE email = 'someone@example.com')::uuid
);

-- Verify it worked
SELECT email, plan 
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE email = 'someone@example.com';
```

---

## ⚠️ Important Notes

1. **First Admin**: Use `bootstrap_admin()` function - it doesn't require admin access
2. **Additional Admins**: After first admin exists, you can use `bootstrap_admin()` OR use the admin panel in the UI
3. **Email Format**: Make sure the email is exactly as it appears (case-sensitive in some databases)
4. **Verification**: Always verify the admin role was granted using the verification queries above

---

## 🔐 Available Admin Functions

All these functions require admin access (except `bootstrap_admin`):

- `bootstrap_admin(uuid)` - Create first admin (no admin check)
- `admin_make_admin(uuid)` - Make user admin (requires admin)
- `admin_remove_admin(uuid)` - Remove admin role (requires admin)
- `admin_grant_subscription(uuid, plan, days, lifetime)` - Grant subscription (requires admin)
- `admin_revoke_subscription(uuid)` - Revoke subscription (requires admin)

---

## 💡 Pro Tips

1. **Always verify after granting**: Run the verification query to confirm
2. **Keep track**: Note down which emails are admins
3. **Use email method**: It's the easiest and least error-prone
4. **Test in development first**: Try these commands in a dev environment before production

---

**Last Updated**: January 2025

