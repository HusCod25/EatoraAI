# Vercel Email Sending Fix Guide

## Current Issue
Getting "No API key found in request" error on https://app.eatora.tech

## Root Cause
Environment variables not properly configured or not applied to production deployment.

---

## ✅ STEP 1: Verify Environment Variables in Vercel

1. Go to: https://vercel.com
2. Click on your project (app.eatora.tech)
3. Go to **Settings** → **Environment Variables**
4. Add these **EXACT** variables (case-sensitive!):

```
Name: VITE_SUPABASE_URL
Value: https://axumwatbsahalscdrryv.supabase.co
Environment: ✅ Production ✅ Preview ✅ Development
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4dW13YXRic2FoYWxzY2Rycnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA1MjUsImV4cCI6MjA3MTU1NjUyNX0.0BizbWyDzYeB2gbq5GZW5kcyX3ev4DdXEcnXUXDEM6M
Environment: ✅ Production ✅ Preview ✅ Development
```

```
Name: VITE_ENABLE_ERROR_TRACKING
Value: true
Environment: ✅ Production ✅ Preview ✅ Development
```

**CRITICAL NOTES:**
- Variable names MUST start with `VITE_` (Vite requirement)
- Check all three environment checkboxes (Production, Preview, Development)
- Values should NOT have quotes around them

---

## ✅ STEP 2: Force Redeploy (REQUIRED!)

Environment variables only work on NEW deployments. You MUST redeploy:

### Option A: Redeploy from Vercel Dashboard
1. Go to **Deployments** tab
2. Click the **3 dots menu** (...) on the latest deployment
3. Click **"Redeploy"**
4. ❗ **UNCHECK** "Use existing Build Cache"
5. Click **"Redeploy"**
6. Wait for deployment to complete (2-3 minutes)

### Option B: Push New Commit (Alternative)
```bash
# Add a comment or make any small change
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

---

## ✅ STEP 3: Verify Environment Variables Are Working

After redeployment completes:

1. Visit: https://app.eatora.tech
2. Open **Developer Tools** (Press F12)
3. Go to **Console** tab
4. Look for these lines:
   ```
   🧠 CHECK ENV:
   VITE_SUPABASE_URL = https://axumwatbsahalscdrryv.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOi... (long token)
   ```

✅ **If you see the values** → Environment variables are working!  
❌ **If you see `undefined`** → Environment variables are NOT loaded, repeat Step 1-2

---

## ✅ STEP 4: Configure Supabase Auth Settings

Once environment variables are working, configure Supabase:

### A. Set Site URL and Redirect URLs
1. Go to: https://app.supabase.com
2. Select your project: `axumwatbsahalscdrryv`
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL**: `https://app.eatora.tech`
5. Add **Redirect URLs**:
   ```
   https://app.eatora.tech
   https://app.eatora.tech/*
   https://app.eatora.tech/reset-password
   http://localhost:5173/*
   ```

### B. Enable Email Confirmation
1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Ensure **"Enable email confirmations"** is ✅ CHECKED

---

## ✅ STEP 5: Fix Email HTML Template

The email template has invalid HTML structure:

1. Go to **Authentication** → **Email Templates** → **Confirm signup**
2. Find this section (near the top):
   ```html
   </head>
   <div style="display:none;...">Confirm your EatoraAI™ account</div>
   <body>
   ```

3. **MOVE** the preview `<div>` **INSIDE** the `<body>` tag:
   ```html
   </head>
   <body style="background-color:#f5f7fb;...">
     <div style="display:none;overflow:hidden;...">Confirm your EatoraAI™ account<div>...</div></div>
     <!-- Rest of email content -->
   ```

4. Click **Save**

### Do the Same for Reset Password Email
1. Go to **Email Templates** → **Reset Password**
2. Fix the same HTML structure issue
3. Click **Save**

---

## ✅ STEP 6: Test Email Sending

1. Visit: https://app.eatora.tech/register
2. Try creating a new account
3. Check for errors in browser console (F12)
4. Check your email inbox (including spam folder)

---

## 🐛 Troubleshooting

### Still Getting "No API key found"?
- ✅ Verify environment variables are in Vercel (Step 1)
- ✅ Make sure you redeployed AFTER adding variables (Step 2)
- ✅ Check browser console shows the env vars (Step 3)
- ✅ Clear browser cache and hard reload (Ctrl+Shift+R)

### Environment Variables Not Showing in Console?
- Variable names must start with `VITE_`
- Must be checked for "Production" environment
- Must redeploy after adding (old deployments don't have them)
- Try unchecking "Use existing Build Cache" when redeploying

### Email Still Not Sending?
- Check Supabase Dashboard → Logs → Edge Functions for errors
- Verify Site URL and Redirect URLs are configured (Step 4)
- Verify Email HTML template is valid (Step 5)
- Check Supabase email rate limits (free tier: 3 emails/hour)

### 500 Error from Different Source?
- Check Supabase Dashboard → Logs → API Logs
- Look for the exact error message
- Might be database trigger errors (check SQL logs)

---

## 📝 Code Changes Made

The following files were updated to fix logger import issues:
- ✅ `src/pages/Register.tsx` - Added missing logger import
- ✅ `src/pages/SignIn.tsx` - Added missing logger import

Commit these changes and push to trigger a new deployment.

---

## Summary Checklist

- [ ] Added environment variables to Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Checked "Production" environment for all variables
- [ ] Redeployed without build cache
- [ ] Verified environment variables appear in browser console
- [ ] Configured Site URL and Redirect URLs in Supabase
- [ ] Fixed email HTML template structure
- [ ] Committed and pushed logger import fixes
- [ ] Tested user registration
- [ ] Received confirmation email

---

## Need Help?

If you're still experiencing issues after following all steps:
1. Check browser console for errors (F12 → Console)
2. Check Vercel deployment logs
3. Check Supabase logs (Dashboard → Logs)
4. Share the exact error message you're seeing

