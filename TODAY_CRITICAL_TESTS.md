# 🚨 TODAY'S CRITICAL TESTS - Before Test Release

## ⏱️ Quick Test Plan (30-45 minutes)

### 🔴 MUST DO - Test These 5 Scenarios First!

---

## Test 1: Purchase New Subscription (10 min) ⭐⭐⭐
**Why:** This tests the main fix - subscription dates updating correctly

**Steps:**
1. Sign in to your app
2. Go to Pricing page → Click "Upgrade Now" on Beginner Plan (€4.99)
3. Use Stripe test card: `4242 4242 4242 4242`, Exp: `12/25`, CVC: `123`
4. Complete checkout

**✅ Verify:**
- Plan shows as "Beginner" (not Free)
- Price shows "€4.99/month"
- **NO "Cancelling at period end" badge**
- Account page shows correct plan

**🔍 Quick DB Check:**
```sql
SELECT plan, subscription_status, current_period_end, cancellation_requested_at 
FROM user_subscriptions 
WHERE user_id = 'YOUR_USER_ID';
```
- `plan` should be `beginner`
- `cancellation_requested_at` should be `NULL`
- `current_period_end` should be ~30 days in future

---

## Test 2: Cancel Subscription (5 min) ⭐⭐⭐
**Why:** Tests cancellation flow and password requirement

**Steps:**
1. With active subscription, go to Settings → Account & Subscription
2. Click "Cancel Subscription"
3. **Verify password field appears**
4. Enter password → Click "Cancel Subscription"

**✅ Verify:**
- Red badge appears: "Cancelling at period end"
- Button changes to "Reactivate Subscription"
- Plan still shows as paid (not free yet)

---

## Test 3: Reactivate Subscription (5 min) ⭐⭐⭐
**Why:** Tests the key fix - NO password required!

**Steps:**
1. With cancelled subscription, click "Reactivate Subscription"
2. **Verify NO password field appears** ← KEY TEST!
3. Click "Reactivate Subscription" (no password needed)

**✅ Verify:**
- Success message appears
- "Cancelling at period end" badge disappears
- Button changes back to "Cancel Subscription"
- Plan still shows as paid

**🔍 Quick DB Check:**
```sql
SELECT cancellation_requested_at 
FROM user_subscriptions 
WHERE user_id = 'YOUR_USER_ID';
```
- Should be `NULL` after reactivation

---

## Test 4: Free Plan Display (5 min) ⭐⭐
**Why:** Tests fix for cancellation status on free plans

**Steps:**
1. If you have free plan (or downgrade to free after period ends)
2. Go to Settings → Account & Subscription

**✅ Verify:**
- Plan shows "Free €0"
- **NO "Cancelling at period end" badge** (even if it was set before)
- "Upgrade Plan" button is visible

**🔧 If you see cancellation badge on free plan:**
Run this SQL in Supabase SQL Editor:
```sql
UPDATE user_subscriptions
SET cancellation_requested_at = NULL, cancellation_cancelled_at = NULL
WHERE plan = 'free' AND user_id = 'YOUR_USER_ID';
```

---

## Test 5: Upgrade Plan (10 min) ⭐⭐
**Why:** Tests that upgrades clear cancellation and update dates

**Steps:**
1. With active Beginner plan, go to Pricing
2. Click "Upgrade Now" on Chef Plan (€14.99)
3. Complete checkout (or if direct upgrade, confirm it works)

**✅ Verify:**
- Plan updates to "Chef"
- Price shows "€14.99/month"
- **Any cancellation status is cleared**
- New period end date is set

**🔍 Quick DB Check:**
```sql
SELECT plan, current_period_end, cancellation_requested_at 
FROM user_subscriptions 
WHERE user_id = 'YOUR_USER_ID';
```
- `plan` should be `chef`
- `cancellation_requested_at` should be `NULL`
- `current_period_end` should be updated

---

## 🎯 Quick Verification Checklist

After running all 5 tests, verify:

- [ ] ✅ No console errors (F12 → Console tab)
- [ ] ✅ All Edge Functions deployed (Supabase Dashboard)
- [ ] ✅ Webhook receiving events (Stripe Dashboard → Webhooks → Events)
- [ ] ✅ Database records are correct (run SQL checks above)
- [ ] ✅ UI shows correct subscription status
- [ ] ✅ Reactivation works WITHOUT password

---

## 🚨 If Something Fails

### Issue: "Cancelling at period end" shows on free plan
**Fix:** Run `FIX_CANCELLATION_FREE_PLAN.sql` in Supabase SQL Editor

### Issue: Reactivation still asks for password
**Fix:** 
1. Check `cancel-subscription` function is deployed (Supabase Dashboard)
2. Check function version is latest
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Subscription date not updating
**Fix:**
1. Check Stripe webhook is active
2. Check Supabase Edge Function logs for errors
3. Manually trigger webhook from Stripe Dashboard

### Issue: Payment not working
**Fix:**
1. Verify Stripe test mode is enabled
2. Check test card numbers are correct
3. Check Stripe Dashboard for payment attempts

---

## ✅ Ready to Release?

Only if ALL 5 tests pass:
- ✅ New subscription purchase works
- ✅ Cancellation works (with password)
- ✅ Reactivation works (WITHOUT password) ← KEY!
- ✅ Free plan doesn't show cancellation
- ✅ Plan upgrades work correctly

**If all pass → You're ready for test release! 🚀**

---

## 📝 Notes for Test Users

When sharing with friends, tell them:
1. Use Stripe test cards (not real cards)
2. Test card: `4242 4242 4242 4242`, Exp: `12/25`, CVC: `123`
3. Report any issues with:
   - Subscription status not updating
   - Cancellation/reactivation not working
   - Payment flow issues
   - UI showing wrong plan/status

---

**Time Estimate:** 30-45 minutes for all 5 tests
**Priority:** Do Tests 1-3 first (most critical)

