# Row Level Security (RLS) Policies Documentation

This document describes all RLS policies in the MunchiesAI™ database.

## Overview

Row Level Security (RLS) ensures that users can only access data they're authorized to see. All sensitive tables have RLS enabled.

## Policy Types

- **Users can view their own data**: Users can only see records they own
- **Users can manage their own data**: Users can create/update/delete their own records
- **Admins can view/manage all data**: Users with admin plan can access all records
- **Public read, authenticated write**: Some tables allow public reads but require authentication for writes

## Tables with RLS Policies

### 1. `user_subscriptions`

**Purpose**: Stores user subscription information

**Policies**:
- **Users can view/update their own subscription**
  - Condition: `user_id = auth.uid()`
  - Operations: SELECT, UPDATE
  
- **Admins can manage any subscription**
  - Condition: User has admin plan
  - Operations: SELECT, INSERT, UPDATE, DELETE

**Migration**: `supabase/migrations/20250115000003_admin_system.sql`

---

### 2. `pending_ingredients`

**Purpose**: Stores user-submitted ingredients awaiting admin approval

**Policies**:
- **Users can view their own pending ingredients**
  - Condition: `auth.uid() = submitted_by`
  - Operations: SELECT
  
- **Users can insert their own pending ingredients**
  - Condition: `auth.uid() = submitted_by`
  - Operations: INSERT
  
- **Users can update their own pending ingredients** (only if status = 'pending')
  - Condition: `auth.uid() = submitted_by AND status = 'pending'`
  - Operations: UPDATE
  
- **Admins can view all pending ingredients**
  - Condition: User has admin plan
  - Operations: SELECT
  
- **Admins can update pending ingredients**
  - Condition: User has admin plan
  - Operations: UPDATE

**Migration**: `supabase/migrations/20250115000001_pending_ingredients.sql`

---

### 3. `error_logs`

**Purpose**: Stores client-side errors for monitoring

**Policies**:
- **Users can view their own errors**
  - Condition: `user_id = auth.uid() OR user_id IS NULL`
  - Operations: SELECT
  
- **Users can insert error logs**
  - Condition: `true` (any authenticated user)
  - Operations: INSERT
  
- **Admins can view all errors**
  - Condition: User has admin plan
  - Operations: SELECT

**Migration**: `supabase/migrations/20250120000002_error_logs_table.sql`

---

### 4. `rate_limits`

**Purpose**: Tracks API call frequency for rate limiting

**Policies**:
- **Users can view their own rate limits**
  - Condition: `user_id = auth.uid()`
  - Operations: SELECT
  
- **Service role can manage rate limits**
  - Condition: `true` (service role only)
  - Operations: ALL

**Migration**: `supabase/migrations/20250120000003_rate_limiting.sql`

---

### 5. `user_activity`

**Purpose**: Tracks user activity (meals generated, recipes saved, etc.)

**Policies**:
- **Users can view/update their own activity**
  - Condition: `user_id = auth.uid()`
  - Operations: SELECT, UPDATE, INSERT

**Migration**: Check `supabase/migrations/` for `user_activity` related migrations

---

### 6. `generated_meals`

**Purpose**: Stores generated meals

**Policies**:
- **Users can view/update/delete their own meals**
  - Condition: `user_id = auth.uid()`
  - Operations: SELECT, UPDATE, DELETE, INSERT

**Migration**: Check `supabase/migrations/` for `generated_meals` related migrations

---

## Admin Plan Check

All admin policies use this pattern to verify admin status:

```sql
EXISTS (
  SELECT 1 FROM public.user_subscriptions 
  WHERE user_id = auth.uid() AND plan = 'admin'
)
```

This ensures that only users with the 'admin' plan in `user_subscriptions` can access admin resources.

## Security Considerations

1. **Never disable RLS** - Always keep RLS enabled on sensitive tables
2. **Use SECURITY DEFINER functions** - For admin operations, use functions with `SECURITY DEFINER` that verify admin access internally
3. **Test policies** - Always test RLS policies with different user roles
4. **Audit regularly** - Review policies periodically for security

## Testing RLS Policies

### Test as Regular User
```sql
-- Switch to regular user context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Try to access data
SELECT * FROM user_subscriptions;
-- Should only return user's own record
```

### Test as Admin
```sql
-- Switch to admin user context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'admin-uuid-here';

-- Verify admin plan
SELECT plan FROM user_subscriptions WHERE user_id = 'admin-uuid-here';
-- Should return 'admin'

-- Try to access all data
SELECT * FROM user_subscriptions;
-- Should return all records
```

## Common Issues

### Issue: User can't see their own data
**Solution**: Check if RLS policy condition matches `auth.uid()` correctly

### Issue: Admin can't access admin resources
**Solution**: Verify user has 'admin' plan in `user_subscriptions` table

### Issue: RLS policy causing infinite recursion
**Solution**: Ensure policy doesn't reference the same table it's protecting without proper conditions

## Migration Best Practices

1. **Enable RLS first**, then create policies
2. **Test policies** before deploying
3. **Document policies** in this file
4. **Version control** all policy changes

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**Last Updated**: January 2025

