# Stripe Free Trial Setup Guide

## ✅ Good News: No Special Stripe Configuration Needed!

The free trial is handled **entirely in code** by setting `trial_period_days = 15` when creating the checkout session. Stripe automatically handles trial periods without any special product configuration.

## 🔍 What You Need to Verify in Stripe

### 1. **Environment Variables** (Required)
Make sure these are set in your Supabase Edge Functions:

```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_PRICE_ID_BEGINNER=price_...
STRIPE_PRICE_ID_CHEF=price_...
STRIPE_PRICE_ID_UNLIMITED=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**To check/update:**
1. Go to Supabase Dashboard → Edge Functions → Settings
2. Verify all Stripe environment variables are set
3. The `STRIPE_PRICE_ID_BEGINNER` is especially important for the free trial

### 2. **Stripe Products & Prices** (Verify they exist)

1. **Go to Stripe Dashboard** → Products
2. **Verify you have these products:**
   - Beginner Plan (with a recurring price of €4.99/month)
   - Chef Plan (with a recurring price of €14.99/month)
   - Unlimited Plan (with a recurring price of €29.99/month)

3. **For each product:**
   - Click on the product
   - Note the **Price ID** (starts with `price_...`)
   - Make sure the Price ID matches what's in your environment variables

### 3. **Stripe Webhook** (Critical!)

The webhook handles the free trial logic. Verify:

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Find your webhook endpoint:**
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. **Verify these events are enabled:**
   - ✅ `checkout.session.completed` (for new subscriptions)
   - ✅ `customer.subscription.updated` (for subscription changes)
   - ✅ `customer.subscription.deleted` (for cancellations)
   - ✅ `invoice.payment_succeeded` (for successful payments)
   - ✅ `invoice.payment_failed` (for failed payments)

4. **Copy the Webhook Signing Secret:**
   - Click on your webhook
   - Click "Reveal" next to "Signing secret"
   - Make sure it's set in Supabase as `STRIPE_WEBHOOK_SECRET`

### 4. **Test Mode vs Live Mode**

⚠️ **Important:** Make sure you're using the correct keys:

- **Test Mode:** Use `sk_test_...` and test webhook endpoints
- **Live Mode:** Use `sk_live_...` and live webhook endpoints

The free trial works in both modes!

## 🧪 How to Test the Free Trial

### Test in Stripe Test Mode:

1. **Use test card numbers:**
   - Success: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

2. **Test flow:**
   - Click "Start Free Trial" button
   - Enter test card details
   - Complete checkout
   - Verify subscription shows "trialing" status in Stripe
   - Verify `free_trial_used` is set to `true` in your database

3. **Test duplicate prevention:**
   - Try using the same card again → Should be blocked
   - Try using the same account again → Should be blocked

## 📋 Quick Checklist

- [ ] All Stripe environment variables set in Supabase
- [ ] Stripe products and prices created
- [ ] Price IDs match environment variables
- [ ] Webhook endpoint configured and active
- [ ] Webhook events enabled (checkout.session.completed, etc.)
- [ ] Webhook signing secret set
- [ ] Tested with test card in Stripe test mode

## 🔧 How the Free Trial Works

1. **User clicks "Start Free Trial"**
   - Frontend checks if user already used trial
   - Backend validates before creating checkout

2. **Stripe Checkout Session Created**
   - `trial_period_days: 15` is set in subscription_data
   - Stripe automatically handles the 15-day trial period
   - User is not charged during trial

3. **After Checkout Completes**
   - Webhook receives `checkout.session.completed` event
   - Validates user hasn't used trial before
   - Validates card hasn't been used for trial before
   - Records card fingerprint in `free_trial_cards` table
   - Sets `free_trial_used = true` in user_subscriptions
   - Subscription status is "trialing" for 15 days

4. **After 15 Days**
   - Stripe automatically charges the card
   - Subscription status becomes "active"
   - User continues on paid plan

## ⚠️ Important Notes

- **No charge during trial:** Stripe won't charge the card until the trial ends
- **Card required:** User must provide a valid card to start trial
- **Automatic conversion:** After 15 days, Stripe automatically charges and activates subscription
- **Cancellation:** User can cancel anytime during trial to avoid being charged

## 🐛 Troubleshooting

**Trial not working?**
1. Check if `trial_period_days: 15` is being set (check Edge Function logs)
2. Verify Stripe product/price exists
3. Check webhook is receiving events
4. Verify environment variables are correct

**Webhook not receiving events?**
1. Check webhook endpoint URL is correct
2. Verify webhook is active (not paused)
3. Check webhook logs in Stripe Dashboard
4. Verify `STRIPE_WEBHOOK_SECRET` is set correctly

