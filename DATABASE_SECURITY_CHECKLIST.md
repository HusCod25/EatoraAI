# Database Security Checklist - Pre-Launch

Comprehensive security checklist to ensure your Supabase database is safe before launching MunchiesAI™.

## 🔒 Critical Security Items

### ✅ 1. Row Level Security (RLS) Policies

**Status**: Check all tables have RLS enabled

```sql
-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Required Actions**:
- [ ] All sensitive tables have RLS enabled
- [ ] Users can only access their own data
- [ ] Admins can access admin resources (verified server-side)
- [ ] Public tables (if any) don't expose sensitive data

**Tables to Verify**:
- `user_subscriptions` ✅ (RLS enabled)
- `pending_ingredients` ✅ (RLS enabled)
- `error_logs` ✅ (RLS enabled)
- `rate_limits` ✅ (RLS enabled)
- `generated_meals` - Verify RLS enabled
- `user_activity` - Verify RLS enabled

---

### ✅ 2. API Keys & Secrets

**Checklist**:
- [ ] `.env` file is NOT committed to git (check `.gitignore`)
- [ ] Production API keys are different from development
- [ ] Supabase `anon` key is safe to expose (client-side only)
- [ ] Supabase `service_role` key is NEVER exposed (server-side only)
- [ ] `OPENAI_API_KEY` is stored as Edge Function secret (not in code)

**Verify**:
```bash
# Check .gitignore includes .env
cat .gitignore | grep -i env

# Check Edge Function secrets
# Go to Supabase Dashboard → Edge Functions → Secrets
```

---

### ✅ 3. Authentication Security

**Supabase Dashboard** → Authentication → Settings

**Checklist**:
- [ ] Email verification is **ENABLED** for new users
- [ ] Password minimum length is set (recommended: 8+ characters)
- [ ] Password complexity requirements (if needed)
- [ ] Session timeout is configured
- [ ] JWT expiration time is reasonable
- [ ] Site URL is set to your production domain
- [ ] Redirect URLs only include trusted domains

**Settings to Verify**:
```
Email Auth → Email Confirm → ENABLED
Password Settings → Min Length → 8
Site URL → https://your-domain.com
Redirect URLs → Only your domains
```

---

### ✅ 4. Database Access Controls

**Checklist**:
- [ ] Only your admin accounts have admin role
- [ ] No test/admin accounts have real user data
- [ ] Service role key is not exposed in client code
- [ ] Database functions use `SECURITY DEFINER` properly
- [ ] Admin functions verify admin access server-side

**Verify Admin Accounts**:
```sql
-- List all admins (should only be trusted users)
SELECT 
  u.email,
  s.plan,
  s.granted_by,
  s.granted_at
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin'
ORDER BY s.granted_at DESC;
```

---

### ✅ 5. Edge Functions Security

**Checklist**:
- [ ] CORS headers are properly configured
- [ ] All Edge Functions verify authentication
- [ ] Rate limiting is implemented (or ready)
- [ ] Input validation is present
- [ ] Error messages don't leak sensitive info
- [ ] API keys are stored as secrets (not hardcoded)

**Functions to Review**:
- `generate-meal` - Requires auth, has OpenAI key
- `submit-ingredient` - Requires auth
- `delete-user` - Requires auth
- `weekly-reset` - Should be cron-only (or admin-only)

---

### ✅ 6. Rate Limiting

**Checklist**:
- [ ] Rate limiting table exists (`rate_limits`)
- [ ] Rate limiting function exists (`check_rate_limit`)
- [ ] Critical endpoints check rate limits
- [ ] Supabase API rate limits are configured

**Verify Rate Limiting**:
```sql
-- Check rate_limits table exists
SELECT * FROM rate_limits LIMIT 1;

-- Test rate limit function
SELECT check_rate_limit(
  auth.uid(),
  'test-endpoint',
  100,  -- max requests
  60    -- window in minutes
);
```

---

### ✅ 7. Environment Variables

**Checklist**:
- [ ] Production `.env` is NOT in git
- [ ] Production environment variables are set in hosting platform
- [ ] No fallback values in production code
- [ ] Environment variables validated on startup

**Verify in Code**:
```typescript
// Check src/integrations/supabase/client.ts
// Should warn if env vars missing in production
```

---

### ✅ 8. Database Backups

**Supabase Dashboard** → Database → Backups

**Checklist**:
- [ ] Daily backups are **ENABLED**
- [ ] Point-in-time recovery is available (if needed)
- [ ] Backup retention period is set
- [ ] Test backup restore process (optional but recommended)

**Settings**:
- Automatic backups: **ENABLED**
- Backup retention: **At least 7 days**

---

### ✅ 9. Network & Access

**Checklist**:
- [ ] Database connection pooling is configured
- [ ] IP restrictions (if needed for additional security)
- [ ] Database password is strong (Supabase managed)
- [ ] Connection SSL is enforced

**Supabase handles most of this, but verify**:
- Connection string uses SSL
- No direct database access from client (only via Supabase API)

---

### ✅ 10. Data Validation

**Checklist**:
- [ ] Database constraints are in place (foreign keys, check constraints)
- [ ] Input validation in Edge Functions
- [ ] SQL injection prevention (using parameterized queries)
- [ ] Data types are correct

**Verify Constraints**:
```sql
-- Check foreign key constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

---

### ✅ 11. Monitoring & Logging

**Checklist**:
- [ ] Error logging is enabled (`error_logs` table)
- [ ] Supabase logs are accessible
- [ ] Alert notifications set up (optional)
- [ ] Monitor for suspicious activity

**Verify Error Logging**:
```sql
-- Check error_logs table exists and has data
SELECT COUNT(*) FROM error_logs;
```

---

### ✅ 12. Admin Access Security

**Checklist**:
- [ ] Only necessary users have admin role
- [ ] Admin functions verify access server-side
- [ ] Admin routes are protected in frontend
- [ ] Admin access logs are reviewed periodically

**Test Admin Security**:
```sql
-- As non-admin user, try to access admin resources
-- Should fail with "Access denied" error
```

---

### ✅ 13. Public Schema Security

**Checklist**:
- [ ] No sensitive data in public tables
- [ ] RLS policies protect all user data
- [ ] Public API endpoints are rate-limited
- [ ] No admin endpoints exposed publicly

---

### ✅ 14. Password Reset Security

**Checklist**:
- [ ] Password reset emails are configured
- [ ] Reset links expire after reasonable time
- [ ] Reset links are single-use only
- [ ] Email templates don't leak information

---

### ✅ 15. Database Migrations

**Checklist**:
- [ ] All migrations have been applied
- [ ] No pending migrations
- [ ] Migrations are tested in staging first
- [ ] Migration rollback plan exists (optional)

**Verify Migrations**:
```sql
-- Check supabase_migrations.schema_migrations table
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;
```

---

## 🔍 Quick Security Audit Commands

### Check RLS Status
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Admin Users
```sql
SELECT 
  u.email,
  s.plan,
  s.granted_at
FROM auth.users u
JOIN user_subscriptions s ON u.id = s.user_id
WHERE s.plan = 'admin';
```

### Check Rate Limiting Setup
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'rate_limits'
) as rate_limiting_exists;
```

### Check Error Logging
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'error_logs'
) as error_logging_exists;
```

---

## 🚨 Security Red Flags to Avoid

- ❌ **NEVER** expose `service_role` key in client code
- ❌ **NEVER** disable RLS on sensitive tables
- ❌ **NEVER** commit `.env` files with real keys
- ❌ **NEVER** give admin role to untrusted users
- ❌ **NEVER** use `*` in CORS for production (unless intentional)
- ❌ **NEVER** skip authentication checks in Edge Functions
- ❌ **NEVER** log sensitive data (passwords, tokens)
- ❌ **NEVER** allow SQL injection (always use parameterized queries)

---

## ✅ Pre-Launch Security Checklist Summary

Before launching, verify:

- [ ] All RLS policies are active
- [ ] Only trusted users have admin role
- [ ] Email verification is enabled
- [ ] Environment variables are secure
- [ ] Edge Functions have proper auth checks
- [ ] Rate limiting is implemented
- [ ] Backups are enabled
- [ ] Error logging is working
- [ ] CORS is properly configured
- [ ] No sensitive data exposed publicly

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Row Level Security Guide](./RLS_POLICIES_DOCUMENTATION.md)
- [Admin Security Guide](./ADMIN_SECURITY_SUMMARY.md)
- [Error Tracking Guide](./ERROR_TRACKING_SUMMARY.md)

---

**Last Updated**: January 2025

**Next Steps**: Go through each item in this checklist and verify your database is secure!

