# 🔍 Verificare: Webhook-ul nu actualizează planul

## Problema identificată

Din logurile tale:
- Planul rămâne `free`
- Status: `revoked`
- Source: `manual`
- Nu are `stripe_subscription_id` (hasStripeId: false)

**Asta înseamnă că webhook-ul nu a procesat evenimentul sau nu a fost apelat deloc.**

---

## 🔍 Verificări necesare

### 1. Verifică logurile webhook-ului în Supabase

**În Supabase Dashboard:**

1. **Mergi la Edge Functions** → **stripe-webhook**
2. **Click pe "Logs"** (sau "View logs")
3. **Caută loguri recente** (ultimele 5-10 minute)
4. **Caută:**
   - `🔔 WEBHOOK: Processing checkout.session.completed`
   - `❌ WEBHOOK ERROR:`
   - `✅ WEBHOOK: Subscription updated successfully`

**Dacă NU vezi NICIUN log:**
- Webhook-ul nu a fost apelat deloc
- Problema: webhook-ul nu este configurat corect în Stripe sau nu primește evenimente

**Dacă vezi erori:**
- Trimite-mi erorile exacte
- Poate fi problema cu signing secret sau cu datele

### 2. Verifică evenimentele în Stripe Dashboard

**În Stripe Dashboard:**

1. **Developers** → **Webhooks** → **AlPaymentSNKS**
2. **Click pe tab-ul "Events"** sau **"Event deliveries"**
3. **Caută evenimente recente** (ultimele 5-10 minute)
4. **Verifică:**
   - Dacă există eveniment `checkout.session.completed`
   - Dacă există, click pe el și verifică:
     - Status code (ar trebui să fie 200)
     - Response (ar trebui să fie `{"received": true}`)
     - Dacă există erori, vezi care sunt

**Dacă NU vezi niciun eveniment:**
- Checkout-ul nu a fost completat cu succes
- Sau Stripe nu trimite evenimente către webhook

**Dacă vezi erori (status 400, 500, etc.):**
- Problema este în webhook-ul tău
- Trimite-mi screenshot-ul cu eroarea

### 3. Verifică abonamentul în baza de date

**În Supabase SQL Editor, rulează:**

```sql
-- Verifică abonamentul tău
SELECT 
  user_id,
  plan,
  subscription_status,
  source,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end,
  created_at,
  updated_at
FROM user_subscriptions 
WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;
```

**Ce să verifici:**
- `stripe_subscription_id` - ar trebui să nu fie NULL dacă webhook-ul a funcționat
- `updated_at` - ar trebui să fie recent (după checkout)
- `source` - ar trebui să fie `stripe` (nu `manual`)

### 4. Verifică checkout-ul în Stripe

**În Stripe Dashboard:**

1. **Payments** → **Checkout sessions**
2. **Caută session-ul recent** (după ce ai cumpărat planul)
3. **Click pe el** și verifică:
   - Status (ar trebui să fie "Complete")
   - Payment status (ar trebui să fie "Paid")
   - Customer ID
   - Subscription ID (ar trebui să existe)
   - Metadata:
     - `supabase_user_id` - ar trebui să fie `abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27`
     - `plan` - ar trebui să fie planul cumpărat (beginner, chef, sau unlimited)

---

## 🔧 Posibile soluții

### Soluția 1: Webhook-ul nu primește evenimente

**Cauză:** Webhook-ul nu este configurat corect în Stripe

**Soluție:**
1. Verifică că webhook-ul este "Active" în Stripe
2. Verifică că URL-ul este corect
3. Verifică că evenimentele sunt selectate corect
4. Testează cu "Send test event" din Stripe

### Soluția 2: Webhook-ul primește dar dă eroare

**Cauză:** Problema în codul webhook-ului sau în configurație

**Soluție:**
1. Verifică logurile din Supabase pentru erori
2. Verifică că `STRIPE_WEBHOOK_SECRET` este setat corect
3. Verifică că toate variabilele de mediu sunt setate

### Soluția 3: Webhook-ul funcționează dar planul nu se actualizează

**Cauză:** Problema în logica webhook-ului sau în baza de date

**Soluție:**
1. Verifică logurile pentru mesaje de succes
2. Verifică că query-ul SQL funcționează
3. Verifică că nu există erori de permisiuni

---

## 📝 Checklist de verificare

- [ ] Am verificat logurile din Supabase Edge Functions → stripe-webhook → Logs
- [ ] Am verificat evenimentele în Stripe Dashboard → Webhooks → Events
- [ ] Am verificat abonamentul în baza de date (query SQL)
- [ ] Am verificat checkout-ul în Stripe Dashboard → Payments → Checkout sessions
- [ ] Am verificat că webhook-ul este "Active" în Stripe
- [ ] Am verificat că `STRIPE_WEBHOOK_SECRET` este setat în Supabase

---

## 🚨 Trimite-mi aceste informații

1. **Screenshot** din Supabase → Edge Functions → stripe-webhook → Logs (ultimele loguri)
2. **Screenshot** din Stripe → Webhooks → Events (ultimele evenimente)
3. **Rezultatul** query-ului SQL de mai sus
4. **Screenshot** din Stripe → Payments → Checkout sessions (ultimul checkout)

Cu aceste informații pot identifica exact problema! 🚀

