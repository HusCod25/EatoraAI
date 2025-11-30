# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for subscription plans.

## 📋 Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Supabase project with Edge Functions enabled
3. Database migration applied (update unlimited plan to 500 meals)

## 🚀 Step-by-Step Setup

### Step 1: Create Stripe Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**

Create three products with recurring monthly prices:

#### Beginner Plan
- **Name**: Beginner Plan
- **Price**: €4.99/month
- **Recurring**: Monthly
- **Copy the Price ID** (starts with `price_...`)

#### Chef Plan
- **Name**: Chef Plan  
- **Price**: €14.99/month
- **Recurring**: Monthly
- **Copy the Price ID**

#### Unlimited Plan
- **Name**: Unlimited Plan
- **Price**: €29.99/month
- **Recurring**: Monthly
- **Copy the Price ID**

### Step 2: Set Up Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
   - Replace `YOUR_PROJECT_ID` with your Supabase project ID
4. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)

### Step 3: Configure Supabase Secrets

1. Go to your Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Step 1)
STRIPE_PRICE_ID_BEGINNER=price_...
STRIPE_PRICE_ID_CHEF=price_...
STRIPE_PRICE_ID_UNLIMITED=price_...
```

### Step 4: Deploy Edge Functions

#### Option A: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy the functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

#### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in Supabase Dashboard
2. For each function (`create-checkout-session` and `stripe-webhook`):
   - Click **Create a new function**
   - Copy the code from `supabase/functions/[function-name]/index.ts`
   - Paste and deploy

### Step 5: Update Database Migration

Run the migration to update the unlimited plan:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/20250121000001_update_unlimited_plan_limit.sql
```

### Step 6: Test the Integration

1. **Test Mode**: Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

2. **Test Flow**:
   - Sign in to your app
   - Open pricing dialog
   - Click "Upgrade Now" on any paid plan
   - Complete checkout with test card
   - Verify subscription is created in database

## 🔒 Security Notes

- **Never commit** Stripe keys to version control
- Use **test keys** during development
- Switch to **live keys** only in production
- Webhook signature verification is already implemented

## 📊 Monitoring

- Check Stripe Dashboard → **Logs** for webhook events
- Check Supabase Dashboard → **Edge Functions** → **Logs** for function execution
- Monitor `user_subscriptions` table for subscription updates

## 🐛 Troubleshooting

### Webhook not receiving events
- Verify webhook URL is correct
- Check webhook secret is set correctly
- Ensure webhook endpoint is accessible (not behind firewall)

### Checkout not working
- Verify Stripe secret key is set
- Check price IDs are correct
- Check Edge Function logs for errors

### Subscription not updating
- Verify webhook events are being sent
- Check Edge Function logs
- Verify database permissions for Edge Functions

## 🎯 Production Checklist

- [ ] Create products in Stripe (live mode)
- [ ] Set up webhook endpoint (live mode)
- [ ] Update secrets with live keys
- [ ] Test full payment flow
- [ ] Set up monitoring/alerts
- [ ] Configure email notifications (optional)

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Note**: Make sure to test thoroughly in test mode before going live!

