# Debug: Planul nu se actualizează după cumpărare

## Pași pentru identificarea problemei

### 1. Verifică logurile webhook-ului Stripe

#### A. În Supabase Dashboard:
1. Mergi la **Edge Functions** → **stripe-webhook**
2. Verifică logurile recente pentru mesaje care încep cu:
   - `🔔 WEBHOOK: Processing checkout.session.completed`
   - `✅ WEBHOOK: Subscription updated successfully`
   - `❌ WEBHOOK ERROR:` (dacă există erori)

#### B. În Stripe Dashboard:
1. Mergi la **Developers** → **Webhooks**
2. Selectează webhook-ul tău
3. Verifică evenimentele primite:
   - `checkout.session.completed` - ar trebui să fie primit
   - Verifică dacă există erori (status 400, 500, etc.)

### 2. Verifică baza de date

Rulează scriptul SQL `DEBUG_SUBSCRIPTION_CHECKOUT.sql` în Supabase SQL Editor pentru a verifica:

```sql
-- Verifică abonamentul tău specific (înlocuiește USER_ID cu ID-ul tău)
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.source,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  us.updated_at,
  p.email
FROM user_subscriptions us
LEFT JOIN profiles p ON p.user_id = us.user_id
WHERE us.user_id = 'YOUR_USER_ID_HERE'::uuid;
```

**Ce să verifici:**
- `plan` ar trebui să fie `beginner`, `chef`, sau `unlimited` (nu `free`)
- `source` ar trebui să fie `stripe`
- `stripe_subscription_id` ar trebui să nu fie NULL
- `subscription_status` ar trebui să fie `active`
- `updated_at` ar trebui să fie recent (după cumpărare)

### 3. Verifică în browser (Console)

După ce cumperi un plan și ești redirecționat înapoi:

1. Deschide **Developer Tools** (F12)
2. Mergi la tab-ul **Console**
3. Caută mesaje care încep cu:
   - `🔄 Starting subscription polling after checkout:`
   - `🔄 Polling subscription (attempt X/15)...`
   - `📊 Current subscription data:`
   - `✅ Plan updated successfully:`

### 4. Verifică configurația webhook-ului

În Stripe Dashboard, verifică că webhook-ul este configurat corect:

1. **URL**: Ar trebui să fie `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
2. **Events**: Ar trebui să includă cel puțin:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. **Signing secret**: Verifică că `STRIPE_WEBHOOK_SECRET` din Supabase este același ca în Stripe

### 5. Probleme comune și soluții

#### Problema: Webhook-ul nu primește evenimentul
**Soluție:**
- Verifică că URL-ul webhook-ului este corect în Stripe
- Verifică că webhook-ul este activ (nu dezactivat)
- Testează manual webhook-ul din Stripe Dashboard

#### Problema: Webhook-ul primește dar planul nu se actualizează
**Soluție:**
- Verifică logurile pentru erori (`❌ WEBHOOK ERROR`)
- Verifică că `metadata.supabase_user_id` și `metadata.plan` sunt setate corect în checkout session
- Verifică că `STRIPE_WEBHOOK_SECRET` este corect

#### Problema: Planul se actualizează în DB dar nu în UI
**Soluție:**
- Refresh manual pagina (Ctrl+F5 sau Cmd+Shift+R)
- Verifică console-ul pentru erori JavaScript
- Verifică că polling-ul funcționează (mesaje în console)

#### Problema: Metadata lipsă în checkout session
**Soluție:**
- Verifică `create-checkout-session/index.ts` că setează metadata corect:
  ```typescript
  metadata: {
    supabase_user_id: user.id,
    plan: plan,
  },
  subscription_data: {
    metadata: {
      supabase_user_id: user.id,
      plan: plan,
    },
  },
  ```

### 6. Testare manuală

#### Test 1: Verifică că webhook-ul răspunde
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'
```

#### Test 2: Reîmprospătează manual abonamentul
După ce verifici că webhook-ul a actualizat planul în DB, poți forța refresh-ul în UI:
1. Apasă Ctrl+F5 pentru hard refresh
2. Sau log out și log in din nou

### 7. Date utile pentru debugging

Când raportezi problema, furnizează:

1. **Din Supabase Logs:**
   - Ultimele loguri din `stripe-webhook` Edge Function
   - Erorile (dacă există)

2. **Din Stripe Dashboard:**
   - ID-ul evenimentului `checkout.session.completed`
   - Status code-ul răspunsului webhook-ului
   - Payload-ul evenimentului (metadata)

3. **Din Browser Console:**
   - Mesajele de polling
   - Erorile JavaScript (dacă există)

4. **Din Database:**
   - Rezultatul query-ului de verificare a abonamentului

### 8. Fix manual temporar (dacă webhook-ul nu funcționează)

Dacă webhook-ul nu funcționează și ai nevoie de un fix rapid, poți actualiza manual planul:

```sql
-- ATENȚIE: Înlocuiește USER_ID și PLAN cu valorile corecte
UPDATE user_subscriptions
SET 
  plan = 'beginner', -- sau 'chef', 'unlimited'
  source = 'stripe',
  subscription_status = 'active',
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;
```

**Apoi:**
- Refresh pagina în browser (Ctrl+F5)
- Sau log out și log in din nou

## Support

Dacă problema persistă după ce ai urmat toți pașii de mai sus, furnizează:
1. Logurile webhook-ului
2. Rezultatul query-ului SQL
3. Screenshot-uri din browser console
4. ID-ul evenimentului Stripe

