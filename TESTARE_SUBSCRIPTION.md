# 🧪 Testing Subscription Functionality

## ✅ Complete Testing Checklist

### Phase 1: Test Checkout & Payment Flow

#### Test 1: Successful Payment
1. **Sign in** to your application
2. **Open Pricing Dialog** (click "See All Plans" or "Upgrade to Premium")
3. **Click "Upgrade Now"** on any paid plan (e.g., Beginner Plan)
4. **You should be redirected** to Stripe Checkout
5. **Use test card**:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/25` (any future date)
   - CVC: `123` (any 3 digits)
   - ZIP: `12345`
6. **Click "Subscribe"**
7. **Expected Result**: 
   - ✅ Redirected back to app
   - ✅ Toast message: "Payment successful! Your subscription has been activated."
   - ✅ Plan updated in UI

#### Test 2: Cancel Checkout
1. **Start checkout** again
2. **Click "Cancel"** or close the Stripe checkout page
3. **Expected Result**:
   - ✅ Redirected back to app
   - ✅ Toast message: "Checkout was canceled. You can try again anytime."
   - ✅ Plan remains unchanged

---

### Phase 2: Test Subscription Activation

#### Test 3: Verify Subscription in Database
1. **After successful payment**, go to **Supabase Dashboard** → **Table Editor** → `user_subscriptions`
2. **Find your user** (by email or user_id)
3. **Verify**:
   - ✅ `plan` = plan you selected (e.g., `beginner`)
   - ✅ `subscription_status` = `active`
   - ✅ `stripe_customer_id` = has value (starts with `cus_...`)
   - ✅ `stripe_subscription_id` = has value (starts with `sub_...`)
   - ✅ `current_period_end` = future date (30 days from now)

#### Test 4: Verify Webhook Received
1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click on your webhook** (`AIPaymentSNKS`)
3. **Click tab "Event deliveries"** or **"Logs"**
4. **Look for recent events**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
5. **Verify events show as "Success"** (green checkmark)

---

### Phase 3: Test Subscription Limits & Features

#### Test 5: Test Meal Limits
1. **After upgrading to Beginner Plan** (40 meals/week):
   - Generate meals until you reach 40
   - **Expected**: Should work fine
   - Try to generate meal #41
   - **Expected**: Should show limit reached message
   - **Verify**: Weekly meals counter shows `40/40 used`

2. **Upgrade to Chef Plan** (80 meals/week):
   - **Expected**: Limit should increase to 80
   - Generate more meals
   - **Verify**: Counter shows correct usage

3. **Upgrade to Unlimited Plan** (500 meals/week):
   - **Expected**: Limit should show as 500
   - **Verify**: Counter shows `X/500 used`

#### Test 6: Test Weekly Reset
1. **Wait for weekly reset** (7 days from subscription start)
   - OR manually test by checking the reset function
2. **After reset**:
   - **Expected**: `weekly_meals_used` should reset to 0
   - **Expected**: `subscription_cycle_start_date` should advance by 7 days
   - **Verify**: You can generate meals again

#### Test 7: Test Plan Features
1. **Test ingredient limits**:
   - Free plan: 6 ingredients max
   - Paid plans: Unlimited ingredients
   
2. **Test saved meals limits**:
   - Free plan: 3 saved meals max
   - Beginner: 20 saved meals max
   - Chef/Unlimited: Unlimited saved meals

3. **Test advanced features**:
   - Advanced recipes (Beginner+)
   - Personalized suggestions (Chef+)
   - Personalized themes (Unlimited)

---

### Phase 4: Test Subscription Management

#### Test 8: Test Subscription Cancellation (via Stripe)
1. **Go to Stripe Dashboard** → **Customers**
2. **Find your customer** (by email)
3. **Click on subscription**
4. **Cancel subscription**
5. **Expected Result**:
   - ✅ Webhook event `customer.subscription.deleted` sent
   - ✅ Subscription status in database changes to `canceled`
   - ✅ Plan downgraded to `free` in database
   - ✅ User sees free plan in app

#### Test 9: Test Subscription Update (Upgrade/Downgrade)
1. **In Stripe Dashboard**, change subscription plan
2. **Expected Result**:
   - ✅ Webhook event `customer.subscription.updated` sent
   - ✅ Plan updated in database
   - ✅ User sees new plan in app

#### Test 10: Test Failed Payment
1. **Use test card that fails**: `4000 0000 0000 0002`
2. **Try to subscribe**
3. **Expected Result**:
   - ✅ Payment fails
   - ✅ Webhook event `invoice.payment_failed` sent
   - ✅ Subscription status changes to `past_due`

---

### Phase 5: Test Edge Cases

#### Test 11: Test Multiple Users
1. **Create a second test account**
2. **Subscribe to different plans**
3. **Verify**: Each user has independent subscription and limits

#### Test 12: Test Subscription Renewal
1. **Wait for subscription period to end** (30 days)
   - OR manually trigger renewal in Stripe
2. **Expected Result**:
   - ✅ Webhook event `invoice.payment_succeeded` sent
   - ✅ `current_period_end` updated in database
   - ✅ Subscription remains active

#### Test 13: Test Current Plan Display
1. **Check different pages**:
   - User Account page
   - Meal Generator page
   - Settings page
2. **Verify**: Current plan is displayed correctly everywhere

---

## 🔍 Quick Verification Queries

### Check User Subscription Status
```sql
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  ua.weekly_meals_used,
  ua.subscription_cycle_start_date
FROM user_subscriptions us
LEFT JOIN user_activity ua ON us.user_id = ua.user_id
WHERE us.user_id = 'YOUR_USER_ID';
```

### Check All Active Subscriptions
```sql
SELECT 
  plan,
  COUNT(*) as count,
  subscription_status
FROM user_subscriptions
GROUP BY plan, subscription_status;
```

### Check Webhook Events (in Stripe)
- Go to Stripe Dashboard → Webhooks → Your webhook → Event deliveries
- Filter by date range
- Check for successful deliveries (green checkmarks)

---

## ✅ Success Criteria

Your subscription system works correctly if:

- ✅ Users can start checkout
- ✅ Payments are processed successfully
- ✅ Webhooks are received and processed
- ✅ Subscriptions are activated in database
- ✅ Plan limits are enforced correctly
- ✅ Weekly resets work (every 7 days from subscription start)
- ✅ Plan features are enabled/disabled based on subscription
- ✅ UI shows correct plan and limits
- ✅ Cancellations downgrade users to free plan

---

## 🐛 Common Issues & Solutions

### Issue: Payment succeeds but subscription not activated
**Check:**
- Webhook logs in Stripe Dashboard
- Edge Function logs for `stripe-webhook`
- Database `user_subscriptions` table

### Issue: Limits not working
**Check:**
- `plan_limits` table has correct values
- `user_activity.weekly_meals_used` is being incremented
- `checkLimit` function in `useSubscription` hook

### Issue: Weekly reset not working
**Check:**
- `subscription_cycle_start_date` is set correctly
- `check_and_reset_user_weekly_count` function is called
- 7 days have passed since cycle start

---

**Happy Testing!** 🚀

















