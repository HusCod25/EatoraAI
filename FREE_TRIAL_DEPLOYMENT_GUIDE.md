# 🚀 Free Trial Deployment Guide - Step by Step

## ✅ What You Already Have

The free trial functionality is **already built into your existing edge functions**:
- `create-checkout-session` - Handles creating checkout with trial period
- `stripe-webhook` - Validates and tracks free trial usage

**You don't need a separate "free trial function" - it's all integrated!**

---

## 📋 Step 1: Database Migration (REQUIRED)

### Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Add free trial tracking to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_trial_used_at TIMESTAMPTZ;

-- Create table to track free trial usage by card (fingerprint)
CREATE TABLE IF NOT EXISTS public.free_trial_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_fingerprint TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_trial_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own free trial card records" ON public.free_trial_cards;
CREATE POLICY "Users can view their own free trial card records" 
ON public.free_trial_cards 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_free_trial_cards_fingerprint ON public.free_trial_cards(card_fingerprint);
CREATE INDEX IF NOT EXISTS idx_free_trial_cards_user_id ON public.free_trial_cards(user_id);
```

**✅ Verify:** After running, check if `free_trial_used` column exists in `user_subscriptions` table.

---

## 📋 Step 2: Update Edge Functions

### A. Update `create-checkout-session` Function

1. **Go to Supabase Dashboard** → Edge Functions → `create-checkout-session`
2. **Copy the ENTIRE code** from `supabase/functions/create-checkout-session/index.ts`
3. **Paste it** into the Supabase editor
4. **Click "Deploy"** or "Save"

**Key parts that handle free trial:**
- Lines 76-95: Checks if user already used trial
- Lines 169-172: Sets `trial_period_days = 15` when `isFreeTrial` is true

### B. Update `stripe-webhook` Function

1. **Go to Supabase Dashboard** → Edge Functions → `stripe-webhook`
2. **Copy the ENTIRE code** from `supabase/functions/stripe-webhook/index.ts`
3. **Paste it** into the Supabase editor
4. **Click "Deploy"** or "Save"

**Key parts that handle free trial:**
- Lines 183-272: Validates user and card haven't used trial before
- Records card fingerprint in `free_trial_cards` table
- Sets `free_trial_used = true` after successful trial

---

## 📋 Step 3: Verify Environment Variables

1. **Go to Supabase Dashboard** → Edge Functions → Settings → Secrets
2. **Verify these are set:**
   - `STRIPE_SECRET_KEY` ✅
   - `STRIPE_PRICE_ID_BEGINNER` ✅
   - `STRIPE_PRICE_ID_CHEF` ✅
   - `STRIPE_PRICE_ID_UNLIMITED` ✅
   - `STRIPE_WEBHOOK_SECRET` ✅
   - `SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅

---

## 📋 Step 4: Verify Frontend Code

The frontend code in `src/components/PricingDialog.tsx` should already have:
- Free trial button (line 204-220)
- Sends `isFreeTrial: true` when clicking "Start Free Trial" (line 208)

**No changes needed** unless you want to customize the button.

---

## 📋 Step 5: Test the Free Trial

### Test Flow:

1. **Open your app** and sign in
2. **Click "Start Free Trial"** button on Beginner Plan
3. **Check Browser Console** (F12 → Network tab):
   - Find request to `create-checkout-session`
   - Verify payload has: `"isFreeTrial": true`
4. **On Stripe Checkout page**, you should see:
   - "€0.00 today" or "Free for 15 days"
   - "Then €4.99/month"
   - "15-day free trial"
5. **Enter test card:** `4242 4242 4242 4242`
6. **Complete checkout**
7. **Verify in Stripe Dashboard:**
   - Subscription status: "trialing"
   - Trial ends: [15 days from now]
8. **Verify in Database:**
   - `user_subscriptions.free_trial_used` = `true`
   - Entry in `free_trial_cards` table

---

## 🐛 Troubleshooting

### Trial not showing on Stripe checkout?

1. **Check Edge Function logs:**
   - Go to Edge Functions → `create-checkout-session` → Logs
   - Look for errors or verify `trial_period_days` is being set

2. **Verify request payload:**
   - Browser Network tab → Check if `isFreeTrial: true` is sent

3. **Check Stripe Price:**
   - Must be a **recurring subscription** price (not one-time)
   - Price should NOT have a trial period set on it

### Trial validation not working?

1. **Check database migration:**
   - Verify `free_trial_used` column exists
   - Verify `free_trial_cards` table exists

2. **Check webhook logs:**
   - Edge Functions → `stripe-webhook` → Logs
   - Look for validation errors

---

## ✅ Checklist

- [ ] Database migration applied (free_trial_used column exists)
- [ ] `free_trial_cards` table created
- [ ] `create-checkout-session` function updated and deployed
- [ ] `stripe-webhook` function updated and deployed
- [ ] Environment variables set
- [ ] Tested with test card
- [ ] Trial period shows on Stripe checkout
- [ ] Subscription shows as "trialing" in Stripe
- [ ] Database shows `free_trial_used = true` after trial

---

## 🎯 Summary

**No separate function needed!** The free trial is integrated into:
- ✅ `create-checkout-session` - Creates checkout with trial
- ✅ `stripe-webhook` - Validates and tracks trial usage
- ✅ Frontend - Shows button and sends `isFreeTrial: true`
- ✅ Database - Stores trial usage data

Just make sure:
1. Database migration is applied ✅
2. Edge functions are updated and deployed ✅
3. Test it works! ✅

