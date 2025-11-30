# 🔍 Verificare: Service Role Key în Webhook

## Problema

Webhook-ul nu actualizează planul, probabil din cauza restricțiilor RLS sau a configurației service role key.

## ✅ Ce am făcut

Am actualizat codul webhook-ului pentru a crea clientul Supabase explicit cu service role key, care **bypass-ează RLS complet**.

## 🔍 Verificări necesare

### 1. Verifică că STRIPE_WEBHOOK_SECRET este setat

**În Supabase Dashboard:**

1. **Edge Functions** → **Secrets**
2. **Verifică că `STRIPE_WEBHOOK_SECRET` există** și are valoarea corectă (whsec_...)

### 2. Verifică că SUPABASE_SERVICE_ROLE_KEY este setat

**În Supabase Dashboard:**

1. **Edge Functions** → **Secrets**
2. **Verifică că `SUPABASE_SERVICE_ROLE_KEY` există**
3. **Dacă nu există**, adaugă-l:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Service role key-ul tău (din Settings → API → service_role key)

### 3. Verifică logurile webhook-ului

**În Supabase Dashboard:**

1. **Edge Functions** → **stripe-webhook** → **Logs**
2. **Caută erori** care încep cu `❌ WEBHOOK ERROR:`
3. **Caută mesaje** despre "Error updating subscription" sau "Error inserting subscription"

**Dacă vezi erori în loguri:**
- Trimite-mi erorile exacte
- Poate fi problema cu RLS sau cu datele

### 4. Testează manual cu service role key

**În Supabase SQL Editor**, rulează:

```sql
-- Test dacă service role poate actualiza (trebuie să rulezi cu service role key)
-- Înlocuiește USER_ID cu ID-ul tău
UPDATE user_subscriptions 
SET 
  plan = 'beginner',
  source = 'stripe',
  subscription_status = 'active',
  stripe_customer_id = 'test_customer',
  stripe_subscription_id = 'test_subscription',
  updated_at = NOW()
WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;

-- Verifică dacă s-a actualizat
SELECT plan, source, subscription_status 
FROM user_subscriptions 
WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;
```

**Dacă query-ul funcționează:**
- Service role key funcționează corect
- Problema este în webhook sau în logica codului

**Dacă query-ul nu funcționează:**
- Problema este cu RLS sau cu permisiuni
- Trebuie să verificăm policies

## 🚀 Redeploy funcția

După ce ai verificat toate cele de mai sus:

1. **Redeploy funcția** în Supabase Dashboard
2. **Testează webhook-ul** din Stripe Dashboard
3. **Verifică logurile** în Supabase

## 📝 Trimite-mi aceste informații

1. **Screenshot** din Supabase → Edge Functions → Secrets (pentru a vedea dacă există `SUPABASE_SERVICE_ROLE_KEY`)
2. **Screenshot** din Supabase → Edge Functions → stripe-webhook → Logs (ultimele loguri, mai ales erorile)
3. **Rezultatul** query-ului SQL de mai sus (dacă funcționează sau nu)

Cu aceste informații pot identifica exact problema! 🚀

