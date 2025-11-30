# 🧪 Pre-Release Testing Checklist

## 📋 Code Verification Summary

### ✅ Changes Made & Deployed:
1. **Subscription Date Sync Fix** (`stripe-webhook`)
   - ✅ Updates `current_period_end` when new plans purchased
   - ✅ Clears cancellation flags when subscription becomes active
   - ✅ Updates plan from Stripe metadata
   - ✅ Clears cancellation flags when downgraded to free

2. **Subscription Cancellation Fix** (`cancel-subscription`)
   - ✅ Password only required for cancellation (not reactivation)
   - ✅ Reactivation works without password

3. **UI Fixes** (`SettingsDialog.tsx`)
   - ✅ Free plans don't show cancellation status
   - ✅ Password field hidden for reactivation
   - ✅ Password field shown only for cancellation

4. **Upgrade Fix** (`create-checkout-session`)
   - ✅ Clears `cancel_at_period_end` when upgrading

---

## 🚨 CRITICAL TESTS (Do These First!)

### Test 1: New Subscription Purchase Flow ⭐
**Priority: CRITICAL**

1. **Sign in** to your app
2. **Go to Pricing/Plans** page
3. **Select a paid plan** (e.g., Beginner Plan - €4.99/month)
4. **Click "Upgrade Now"** or "Subscribe"
5. **Complete Stripe Checkout** with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - ZIP: `12345`
6. **Verify After Purchase:**
   - ✅ Redirected back to app successfully
   - ✅ Success toast message appears
   - ✅ Plan badge shows correct plan (e.g., "Beginner")
   - ✅ Price shows correctly (e.g., "€4.99/month")
   - ✅ **NO "Cancelling at period end" badge appears**
   - ✅ Account page shows correct plan

**Database Check:**
- Go to Supabase → Table Editor → `user_subscriptions`
- Find your user record
- Verify:
  - ✅ `plan` = `beginner` (or plan you selected)
  - ✅ `subscription_status` = `active`
  - ✅ `current_period_end` = future date (~30 days from now)
  - ✅ `cancellation_requested_at` = `NULL`
  - ✅ `stripe_subscription_id` = has value (starts with `sub_`)

---

### Test 2: Subscription Cancellation Flow ⭐
**Priority: CRITICAL**

1. **With an active paid subscription**, go to **Settings** → **Account & Subscription**
2. **Click "Cancel Subscription"**
3. **Verify:**
   - ✅ Password field appears
   - ✅ Dialog shows warning message
   - ✅ Button is disabled until password entered
4. **Enter your password** and click "Cancel Subscription"
5. **Verify After Cancellation:**
   - ✅ Success toast appears
   - ✅ Red badge shows "Cancelling at period end" or "Cancelling on [date]"
   - ✅ "Cancel Subscription" button changes to "Reactivate Subscription"
   - ✅ Plan still shows as paid (not free yet)

**Database Check:**
- Verify `cancellation_requested_at` is set (not NULL)
- Verify `current_period_end` is still in the future
- Verify `plan` is still the paid plan (not 'free')

---

### Test 3: Subscription Reactivation Flow ⭐
**Priority: CRITICAL**

1. **With a cancelled subscription**, go to **Settings** → **Account & Subscription**
2. **Click "Reactivate Subscription"**
3. **Verify:**
   - ✅ **NO password field appears** (this is the key fix!)
   - ✅ Dialog shows reactivation message
   - ✅ Button is enabled immediately
4. **Click "Reactivate Subscription"** (no password needed)
5. **Verify After Reactivation:**
   - ✅ Success toast appears
   - ✅ "Cancelling at period end" badge disappears
   - ✅ Button changes back to "Cancel Subscription"
   - ✅ Plan still shows as paid

**Database Check:**
- Verify `cancellation_requested_at` = `NULL`
- Verify `plan` is still the paid plan
- Verify `subscription_status` = `active`

---

### Test 4: Free Plan Display ⭐
**Priority: CRITICAL**

1. **If you have a free plan** (or downgrade to free):
2. **Go to Settings** → **Account & Subscription**
3. **Verify:**
   - ✅ Plan shows as "Free" with "€0"
   - ✅ **NO "Cancelling at period end" badge appears** (even if flag was set)
   - ✅ "Upgrade Plan" button is visible
   - ✅ No cancellation section appears

**Database Check:**
- Run the SQL script `FIX_CANCELLATION_FREE_PLAN.sql` if needed
- Verify free plans have `cancellation_requested_at` = `NULL`

---

### Test 5: Plan Upgrade Flow ⭐
**Priority: CRITICAL**

1. **With an active paid subscription** (e.g., Beginner Plan)
2. **Go to Pricing** page
3. **Select a higher tier plan** (e.g., Chef Plan - €14.99/month)
4. **Click "Upgrade Now"**
5. **Complete checkout** (or if upgrading existing subscription, it should update immediately)
6. **Verify:**
   - ✅ Plan updates to new plan
   - ✅ Price updates correctly
   - ✅ **Any cancellation status is cleared**
   - ✅ New `current_period_end` date is set

**Database Check:**
- Verify `plan` = new plan (e.g., `chef`)
- Verify `cancellation_requested_at` = `NULL` (if it was set before)
- Verify `current_period_end` is updated

---

## 📝 COMPREHENSIVE TESTING CHECKLIST

### Phase 1: Authentication & User Management

#### Sign Up Flow
- [ ] New user can create account
- [ ] Email verification works (if enabled)
- [ ] User profile is created automatically
- [ ] Free subscription is assigned automatically
- [ ] User can sign in after sign up

#### Sign In Flow
- [ ] Existing user can sign in
- [ ] Wrong password shows error
- [ ] User session persists after page refresh
- [ ] User can sign out

#### Password Reset
- [ ] Password reset email is sent
- [ ] Password reset link works
- [ ] User can set new password

---

### Phase 2: Subscription & Payment (CRITICAL)

#### Subscription Plans Display
- [ ] All plans show correct prices
- [ ] Plan features are displayed correctly
- [ ] Current plan is highlighted
- [ ] "Upgrade Plan" button shows for non-unlimited plans
- [ ] Free plan shows "€0"

#### Checkout Flow
- [ ] Clicking "Upgrade Now" redirects to Stripe
- [ ] Stripe checkout page loads correctly
- [ ] Test card payment works (`4242 4242 4242 4242`)
- [ ] Success redirect works
- [ ] Cancel redirect works
- [ ] Error handling works (declined card, etc.)

#### Subscription Activation
- [ ] After payment, plan updates in UI
- [ ] Success toast appears
- [ ] Database is updated correctly
- [ ] Webhook receives `checkout.session.completed`
- [ ] Subscription status is `active`
- [ ] `current_period_end` is set correctly

#### Subscription Cancellation
- [ ] Cancel button appears for paid plans
- [ ] Password is required for cancellation
- [ ] Cancellation confirmation dialog works
- [ ] After cancellation, badge shows "Cancelling at period end"
- [ ] Plan remains active until period end
- [ ] Database shows `cancellation_requested_at` set

#### Subscription Reactivation
- [ ] Reactivate button appears for cancelled subscriptions
- [ ] **NO password required** (key fix!)
- [ ] Reactivation works without password
- [ ] Cancellation badge disappears after reactivation
- [ ] Database clears `cancellation_requested_at`

#### Plan Upgrade
- [ ] User can upgrade to higher tier
- [ ] Upgrade clears cancellation status
- [ ] New plan is activated immediately
- [ ] Proration works correctly (if applicable)

#### Plan Downgrade
- [ ] User cannot downgrade while subscription active
- [ ] Error message shows when attempting downgrade
- [ ] User must cancel first, then wait for period end

#### Free Trial (if applicable)
- [ ] Free trial option shows for Beginner plan
- [ ] Free trial checkout works
- [ ] Trial period is 15 days
- [ ] User cannot use trial twice
- [ ] Card cannot be used for trial twice

---

### Phase 3: Payment History & Methods

#### Payment History
- [ ] Payment history loads correctly
- [ ] Past payments are displayed
- [ ] Payment amounts are correct
- [ ] Payment dates are correct
- [ ] Payment status badges show correctly
- [ ] Refresh button works

#### Payment Methods
- [ ] Saved payment methods are displayed
- [ ] User can add new payment method
- [ ] User can set default payment method
- [ ] User can remove payment method
- [ ] Cannot remove last payment method (if required)

---

### Phase 4: Core App Features

#### Meal Generation
- [ ] User can generate meals
- [ ] Plan limits are enforced (meals per week)
- [ ] Upgrade prompt shows when limit reached
- [ ] Generated meals are saved correctly

#### Ingredients
- [ ] User can search ingredients
- [ ] User can add custom ingredients
- [ ] Ingredient limits are enforced
- [ ] Upgrade prompt shows when limit reached

#### Saved Meals
- [ ] User can save meals
- [ ] Saved meals limit is enforced
- [ ] User can view saved meals
- [ ] User can delete saved meals

#### Advanced Features (Premium Plans)
- [ ] Advanced recipes work for Chef/Unlimited plans
- [ ] Personalized suggestions work
- [ ] Personalized themes work
- [ ] Free plan users see upgrade prompts

---

### Phase 5: UI/UX & Error Handling

#### Navigation
- [ ] All pages are accessible
- [ ] Navigation menu works
- [ ] Back button works
- [ ] Links are not broken

#### Responsive Design
- [ ] App works on desktop
- [ ] App works on tablet
- [ ] App works on mobile
- [ ] UI elements are not cut off

#### Error Messages
- [ ] Error messages are user-friendly
- [ ] Network errors are handled gracefully
- [ ] 404 pages work
- [ ] Loading states show correctly

#### Toast Notifications
- [ ] Success toasts appear
- [ ] Error toasts appear
- [ ] Toasts auto-dismiss
- [ ] Multiple toasts stack correctly

---

### Phase 6: Edge Cases & Error Scenarios

#### Subscription Edge Cases
- [ ] What happens if webhook fails?
- [ ] What happens if Stripe is down?
- [ ] What happens if payment fails?
- [ ] What happens if subscription expires?
- [ ] What happens if user cancels during trial?

#### Data Consistency
- [ ] Free plan users don't see cancellation status
- [ ] Cancelled subscriptions show correct status
- [ ] Reactivated subscriptions clear cancellation
- [ ] Plan upgrades update dates correctly

#### Concurrent Actions
- [ ] User cannot cancel twice
- [ ] User cannot reactivate if not cancelled
- [ ] User cannot upgrade while cancelling (should work)
- [ ] Multiple tabs don't cause conflicts

---

### Phase 7: Performance & Security

#### Performance
- [ ] Pages load quickly (< 3 seconds)
- [ ] No console errors
- [ ] No memory leaks
- [ ] Images load correctly

#### Security
- [ ] User data is protected (RLS policies)
- [ ] API keys are not exposed
- [ ] Passwords are not logged
- [ ] HTTPS is enforced

---

## 🔍 Pre-Release Verification

### Database Checks
- [ ] Run `FIX_CANCELLATION_FREE_PLAN.sql` to clean up any orphaned cancellation flags
- [ ] Verify all Edge Functions are deployed and active
- [ ] Check webhook endpoint is configured in Stripe
- [ ] Verify environment variables are set correctly

### Stripe Dashboard Checks
- [ ] Webhook endpoint is active
- [ ] Webhook events are being received
- [ ] Test events work (send test event from Stripe)
- [ ] Products and prices are configured correctly

### Supabase Dashboard Checks
- [ ] All Edge Functions show as "Active"
- [ ] Edge Function logs show no errors
- [ ] Database tables are correct
- [ ] RLS policies are enabled

---

## 🐛 Known Issues to Watch For

1. **Cancellation Status on Free Plans**
   - If you see this, run `FIX_CANCELLATION_FREE_PLAN.sql`
   - Should be fixed by UI logic, but SQL ensures data consistency

2. **Subscription Date Not Updating**
   - Check webhook logs in Supabase
   - Verify Stripe webhook is receiving events
   - Check `current_period_end` in database

3. **Reactivation Requires Password**
   - Verify `cancel-subscription` function is deployed
   - Check function version in Supabase Dashboard

---

## ✅ Final Pre-Release Checklist

- [ ] All critical tests (1-5) passed
- [ ] All subscription flows work correctly
- [ ] No console errors
- [ ] No database inconsistencies
- [ ] Webhook events are processing
- [ ] Payment flow works end-to-end
- [ ] Error handling works
- [ ] UI is responsive
- [ ] All fixes are deployed
- [ ] SQL cleanup script run (if needed)

---

## 📞 If Issues Found

1. **Check Supabase Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions → [function name] → Logs
   - Look for error messages

2. **Check Stripe Webhook Logs**
   - Go to Stripe Dashboard → Developers → Webhooks → [webhook name] → Events
   - Look for failed events

3. **Check Browser Console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

4. **Check Database**
   - Verify subscription records in `user_subscriptions` table
   - Check for any NULL values where they shouldn't be

---

## 🚀 Ready for Test Release?

Only proceed if:
- ✅ All critical tests (1-5) passed
- ✅ No blocking bugs found
- ✅ Payment flow works end-to-end
- ✅ Subscription management works correctly
- ✅ All fixes are deployed

**Good luck with your test release! 🎉**

