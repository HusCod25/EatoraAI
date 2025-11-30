# 🚀 Pașii Următori - Integrare Stripe

## ✅ Pasul 1: Rulează Migrația SQL (Actualizează Planul Unlimited)

**Ce face:** Schimbă planul "unlimited" de la "∞" la "500 meals per week"

1. Mergi la **Supabase Dashboard** → **SQL Editor**
2. Click pe **"New Query"**
3. Copiază tot conținutul din fișierul: `supabase/migrations/20250121000001_update_unlimited_plan_limit.sql`
4. Lipește în SQL Editor
5. Click **"Run"**
6. Verifică că apare "Success"

**Verificare:**
```sql
SELECT plan, meals_per_week FROM plan_limits WHERE plan = 'unlimited';
-- Ar trebui să vezi: unlimited | 500
```

---

## 💳 Pasul 2: Configurează Stripe (Creează Produsele)

### 2.1 Creează Cont Stripe (dacă nu ai)
- Mergi la https://stripe.com
- Creează cont (test mode e activat automat)

### 2.2 Creează Produsele și Prețurile

1. **Mergi la Stripe Dashboard** → **Products** → **Add Product**

#### Produs 1: Beginner Plan
- **Name**: `Beginner Plan`
- **Description**: `40 meals per week, unlimited ingredients`
- Click **"Add Price"**:
  - **Price**: `4.99`
  - **Currency**: `EUR`
  - **Billing period**: `Recurring` → `Monthly`
- Click **"Save"**
- **IMPORTANT:** Copiază **Price ID** (începe cu `price_...`) - vei avea nevoie mai târziu

#### Produs 2: Chef Plan
- **Name**: `Chef Plan`
- **Description**: `80 meals per week, personalized suggestions`
- Click **"Add Price"**:
  - **Price**: `14.99`
  - **Currency**: `EUR`
  - **Billing period**: `Recurring` → `Monthly`
- Click **"Save"**
- **Copiază Price ID**

#### Produs 3: Unlimited Plan
- **Name**: `Unlimited Plan`
- **Description**: `500 meals per week, all features`
- Click **"Add Price"**:
  - **Price**: `29.99`
  - **Currency**: `EUR`
  - **Billing period**: `Recurring` → `Monthly`
- Click **"Save"**
- **Copiază Price ID**

---

## 🔗 Pasul 3: Configurează Stripe Webhook

1. **Mergi la Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: 
   ```
   https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
   ```
   (sau înlocuiește cu URL-ul tău Supabase)
4. **Events to send** - Selectează:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**
6. **IMPORTANT:** Copiază **Signing secret** (începe cu `whsec_...`) - vei avea nevoie în pasul următor

---

## 🔐 Pasul 4: Adaugă Secret-urile în Supabase

1. **Mergi la Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Click **"Add new secret"** și adaugă fiecare:

#### Secret 1: STRIPE_SECRET_KEY
- **Name**: `STRIPE_SECRET_KEY`
- **Value**: `sk_test_...` (Secret key din Stripe Dashboard → Developers → API keys)
- Click **"Save"**

#### Secret 2: STRIPE_WEBHOOK_SECRET
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: `whsec_...` (Signing secret din Pasul 3)
- Click **"Save"**

#### Secret 3: STRIPE_PRICE_ID_BEGINNER
- **Name**: `STRIPE_PRICE_ID_BEGINNER`
- **Value**: `price_...` (Price ID din Pasul 2.2 - Beginner Plan)
- Click **"Save"**

#### Secret 4: STRIPE_PRICE_ID_CHEF
- **Name**: `STRIPE_PRICE_ID_CHEF`
- **Value**: `price_...` (Price ID din Pasul 2.2 - Chef Plan)
- Click **"Save"**

#### Secret 5: STRIPE_PRICE_ID_UNLIMITED
- **Name**: `STRIPE_PRICE_ID_UNLIMITED`
- **Value**: `price_...` (Price ID din Pasul 2.2 - Unlimited Plan)
- Click **"Save"**

---

## 📦 Pasul 5: Deploy Edge Functions

Ai două opțiuni:

### Opțiunea A: Supabase Dashboard (Recomandat)

1. **Mergi la Supabase Dashboard** → **Edge Functions**

#### Funcția 1: create-checkout-session
1. Click **"Create a new function"**
2. **Function name**: `create-checkout-session`
3. Copiază tot conținutul din `supabase/functions/create-checkout-session/index.ts`
4. Lipește în editor
5. Click **"Deploy"**

#### Funcția 2: stripe-webhook
1. Click **"Create a new function"**
2. **Function name**: `stripe-webhook`
3. Copiază tot conținutul din `supabase/functions/stripe-webhook/index.ts`
4. Lipește în editor
5. Click **"Deploy"**

### Opțiunea B: Supabase CLI

```bash
# Install Supabase CLI (dacă nu ai)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref axumwatbsahalscdrryv

# Deploy functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

---

## ✅ Pasul 6: Testează Integrarea

### 6.1 Test în Aplicație

1. **Pornește aplicația** (dacă nu rulează):
   ```bash
   npm run dev
   ```

2. **Sign in** în aplicație

3. **Deschide Pricing Dialog**:
   - Click pe "See All Plans" sau "Upgrade to Premium"

4. **Testează Checkout**:
   - Click pe "Upgrade Now" la orice plan plătit
   - Ar trebui să te redirecționeze la Stripe Checkout

5. **Test Card** (Stripe Test Mode):
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Orice dată viitoare (ex: `12/25`)
   - **CVC**: Orice 3 cifre (ex: `123`)
   - **ZIP**: Orice (ex: `12345`)

6. **Completează Checkout**:
   - Ar trebui să te redirecționeze înapoi la aplicație
   - Ar trebui să vezi toast "Payment successful!"
   - Abonamentul ar trebui să fie actualizat în baza de date

### 6.2 Verifică în Baza de Date

```sql
-- Verifică abonamentul utilizatorului
SELECT user_id, plan, subscription_status, stripe_customer_id 
FROM user_subscriptions 
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🐛 Troubleshooting

### Problema: Checkout nu se deschide
**Soluție:**
- Verifică că Edge Function `create-checkout-session` este deploy-ată
- Verifică console-ul browserului pentru erori
- Verifică Supabase Edge Functions logs

### Problema: Webhook nu funcționează
**Soluție:**
- Verifică că webhook URL-ul este corect
- Verifică că signing secret-ul este corect
- Verifică Stripe Dashboard → Webhooks → Events pentru a vedea dacă evenimentele sunt trimise

### Problema: Abonamentul nu se actualizează
**Soluție:**
- Verifică Stripe Dashboard → Webhooks → Events
- Verifică Supabase Edge Functions logs pentru `stripe-webhook`
- Verifică că toate secret-urile sunt setate corect

---

## 📝 Checklist Final

- [ ] Migrația SQL rulată (Pasul 1)
- [ ] Produsele create în Stripe (Pasul 2)
- [ ] Webhook configurat (Pasul 3)
- [ ] Toate secret-urile adăugate în Supabase (Pasul 4)
- [ ] Edge Functions deploy-ate (Pasul 5)
- [ ] Testat checkout cu card de test (Pasul 6)

---

## 🎯 Când ești gata pentru producție:

1. **Switch to Live Mode** în Stripe Dashboard
2. **Creează produsele din nou** în Live Mode
3. **Actualizează secret-urile** cu cheile LIVE
4. **Reconfigurează webhook-ul** pentru Live Mode
5. **Testează din nou** cu card real

---

**Întrebări?** Verifică `STRIPE_SETUP.md` pentru detalii suplimentare!

