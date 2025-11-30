# 🔍 Debug: Planul nu se actualizează după plată

## Verificări Pas cu Pas

### Pasul 1: Verifică în Stripe Dashboard dacă webhook-ul a fost primit

1. **Mergi la Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click pe webhook-ul tău** (`AIPaymentSNKS`)
3. **Click pe tab-ul "Event deliveries"** sau **"Logs"**
4. **Caută evenimente recente** după ce ai făcut checkout-ul
5. **Verifică**:
   - ✅ Vezi evenimentul `checkout.session.completed`?
   - ✅ Status-ul este "Success" (verde) sau "Failed" (roșu)?
   - ✅ Ce răspuns a primit (Response)?

**Dacă vezi "Failed"**:
- Click pe eveniment
- Verifică eroarea
- Spune-mi ce eroare vezi

---

### Pasul 2: Verifică în Supabase Edge Functions logs

1. **Mergi la Supabase Dashboard** → **Edge Functions** → `stripe-webhook` (sau `dynamic-endpoint`)
2. **Click pe tab-ul "Logs"** sau **"Invocation Logs"**
3. **Caută invocări recente** după ce ai făcut checkout-ul
4. **Verifică**:
   - ✅ Vezi invocări pentru webhook-ul?
   - ✅ Există erori în logs?
   - ✅ Ce răspunde funcția?

**Dacă nu vezi invocări**:
- Webhook-ul nu este primit de Supabase
- Verifică URL-ul webhook-ului în Stripe

---

### Pasul 3: Verifică în baza de date

1. **Mergi la Supabase Dashboard** → **Table Editor** → `user_subscriptions`
2. **Găsește user-ul tău** (după email sau user_id)
3. **Verifică**:
   - ✅ `plan` este încă `free` sau s-a schimbat?
   - ✅ `stripe_customer_id` are o valoare?
   - ✅ `stripe_subscription_id` are o valoare?
   - ✅ `subscription_status` este `active`?

**Dacă planul este încă `free`**:
- Webhook-ul nu a actualizat baza de date
- Verifică logs-urile webhook-ului pentru erori

---

### Pasul 4: Testează manual webhook-ul

1. **Mergi la Stripe Dashboard** → **Webhooks** → **Your webhook**
2. **Click pe "Send test webhook"**
3. **Selectează evenimentul**: `checkout.session.completed`
4. **Click "Send test webhook"**
5. **Verifică**:
   - ✅ Apare în Event deliveries?
   - ✅ Status-ul este "Success"?
   - ✅ Se actualizează planul în baza de date?

---

## Problema Comune: Webhook-ul nu este primit

**Soluție:**
1. Verifică că URL-ul webhook-ului este corect în Stripe
2. Verifică că funcția `stripe-webhook` este deploy-ată în Supabase
3. Verifică că signing secret-ul este setat corect

---

## Problema Comune: Webhook-ul primește dar nu actualizează

**Soluție:**
1. Verifică logs-urile Edge Function pentru erori
2. Verifică că metadata-ul este trimis corect (supabase_user_id, plan)
3. Verifică că user_id-ul este corect

---

**Spune-mi ce vezi în fiecare pas și te ajut să rezolvăm problema!**

















