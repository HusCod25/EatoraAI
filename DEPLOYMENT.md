# Deployment Guide for MunchiesAI™

This guide provides step-by-step instructions for deploying MunchiesAI™ to production.

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Supabase project created and configured
- [ ] All database migrations applied
- [ ] Environment variables set up
- [ ] Edge Functions deployed
- [ ] Domain/URL for your app (optional)

## 🚀 Deployment Steps

### Step 1: Set Up Environment Variables

1. **Create `.env` file** (or set in your hosting platform):
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_ENABLE_ERROR_TRACKING=true
   ```

2. **For Production**: Set these as environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - Render: Environment → Environment Variables

### Step 2: Deploy Database Migrations

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run all migrations** in order (from `supabase/migrations/`):
   - Run each migration file sequentially
   - Or use Supabase CLI: `supabase db push`

### Step 3: Deploy Edge Functions

1. **Go to Supabase Dashboard** → Edge Functions
2. **Deploy each function**:
   - `generate-meal` - Requires `OPENAI_API_KEY` secret
   - `submit-ingredient` - For ingredient submissions
   - `delete-user` - For account deletion
   - `weekly-reset` - For weekly meal count resets
   - `cleanup-expired-meals` - For cleaning up old meals

3. **Set Function Secrets**:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-key
   ```

### Step 4: Deploy Frontend

#### Option A: Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. **Set environment variables** (from Step 1)
4. **Deploy**

#### Option B: Netlify

1. **Connect your repository** to Netlify
2. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Set environment variables** (from Step 1)
4. **Deploy**

#### Option C: Render

1. **Create a new Static Site**
2. **Connect your repository**
3. **Configure**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
4. **Set environment variables** (from Step 1)
5. **Deploy**

### Step 5: Configure Custom Domain (Optional)

1. **In your hosting platform**, add your custom domain
2. **Update Supabase Auth redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your production URL to "Site URL" and "Redirect URLs"

### Step 6: Verify Deployment

1. **Test the app**:
   - [ ] User registration works
   - [ ] User login works
   - [ ] Meal generation works
   - [ ] Ingredient submission works
   - [ ] Admin panel accessible (if applicable)

2. **Check error tracking**:
   - Verify errors are being logged to Supabase `error_logs` table

3. **Monitor performance**:
   - Check Supabase dashboard for function invocations
   - Monitor API usage

## 🔧 Post-Deployment

### 1. Set Up Admin User

Run this SQL in Supabase SQL Editor:

```sql
-- Replace 'your-user-id' with the actual user UUID
SELECT bootstrap_admin('your-user-id'::uuid);
```

Or use the admin panel to grant admin role to your user.

### 2. Configure Weekly Reset Cron

Set up a cron job to call the `weekly-reset` Edge Function weekly:

- **Option 1**: Use Supabase Cron Jobs (if available)
- **Option 2**: Use external cron service (cron-job.org, etc.)
- **Option 3**: Use GitHub Actions scheduled workflow

Example cron schedule: `0 0 * * 0` (Every Sunday at midnight)

### 3. Set Up Monitoring

- **Error Tracking**: Check `error_logs` table regularly
- **Supabase Logs**: Monitor Edge Function logs
- **Analytics**: Set up analytics tracking (optional)

## 🔒 Security Checklist

- [ ] Environment variables are not exposed in client code
- [ ] CORS is properly configured
- [ ] RLS policies are active
- [ ] Admin functions verify admin access server-side
- [ ] Rate limiting is enabled (if applicable)
- [ ] API keys are stored as secrets

## 📊 Monitoring & Maintenance

### Regular Tasks

1. **Weekly**: Check error logs for issues
2. **Monthly**: Review Edge Function usage
3. **As needed**: Update dependencies

### Database Maintenance

- Monitor database size
- Clean up old data periodically
- Review RLS policies regularly

## 🐛 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Verify variable names start with `VITE_`
   - Restart dev server or redeploy
   - Check hosting platform environment variable settings

2. **CORS Errors**
   - Verify CORS headers in Edge Functions
   - Check allowed origins in Supabase settings

3. **Authentication Issues**
   - Verify redirect URLs in Supabase Auth settings
   - Check session storage permissions

4. **Edge Functions Not Working**
   - Verify function secrets are set
   - Check function logs in Supabase dashboard
   - Ensure function is deployed and active

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Environment Variables Setup](./ENV_SETUP.md)
- [Error Tracking Setup](./ERROR_TRACKING_SUMMARY.md)

## 🆘 Support

If you encounter issues:

1. Check error logs in Supabase `error_logs` table
2. Review Supabase Edge Function logs
3. Check browser console for client-side errors
4. Review this deployment guide

---

**Last Updated**: January 2025

