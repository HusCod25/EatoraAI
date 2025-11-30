# 🔧 Fix: "No results found" în Stripe Webhook

## Problema
Când cauți webhook-ul în Stripe Dashboard, apare "no results found" - asta înseamnă că webhook-ul nu este configurat.

## Soluție pas cu pas

### ✅ PASUL 1: Verifică dacă funcția este deploy-ată în Supabase

**În Supabase Dashboard:**
1. Mergi la **Edge Functions** (meniul din stânga)
2. Caută funcția `stripe-webhook` în listă
3. **Dacă NU există:**
   - Funcția nu este deploy-ată
   - Trebuie să o deploy-ăm mai întâi

**Cum să deploy-ezi funcția:**

#### Opțiunea A: Via Supabase Dashboard (CEL MAI UȘOR)
1. Mergi la **Edge Functions** → **Create a new function**
2. Numele funcției: `stripe-webhook`
3. Copiază tot codul din `supabase/functions/stripe-webhook/index.ts`
4. Click **Deploy**

#### Opțiunea B: Via CLI
```bash
# Asigură-te că ești în folderul proiectului
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"

# Login în Supabase (dacă nu ești deja logat)
npx supabase login

# Link la proiect (dacă nu ești deja link-at)
npx supabase link --project-ref axumwatbsahalscdrryv

# Deploy funcția
npx supabase functions deploy stripe-webhook
```

**După deploy:**
- Verifică că funcția apare în lista de Edge Functions
- Verifică că status-ul este "Active"

---

### ✅ PASUL 2: Configurează webhook-ul în Stripe

1. **Mergi la Stripe Dashboard**: https://dashboard.stripe.com
2. **Asigură-te că ești în "Test mode"** (buton în colțul din dreapta sus)
3. **Mergi la Developers → Webhooks**
4. **Click pe "Add endpoint"** sau **"+ Add endpoint"**

**În formular:**

#### A. Endpoint URL:
```
https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**⚠️ IMPORTANT:** 
- Înlocuiește `axumwatbsahalscdrryv` cu ID-ul tău real de proiect Supabase
- Găsești ID-ul în URL-ul Supabase Dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

#### B. Events to send:
Selectează următoarele evenimente:

1. ✅ `checkout.session.completed`
2. ✅ `customer.subscription.updated`
3. ✅ `customer.subscription.deleted`
4. ✅ `invoice.payment_succeeded`
5. ✅ `invoice.payment_failed`

**Cum să selectezi:**
- Click pe "Select events to listen to"
- Caută fiecare eveniment în bara de căutare
- Bifează fiecare eveniment

#### C. Salvează:
- Click pe **"Add endpoint"** sau **"Save"**

**Ce se va întâmpla:**
- Stripe va încerca să verifice că endpoint-ul funcționează
- Dacă vezi eroare "Unable to reach endpoint", înseamnă că funcția nu este deploy-ată (vezi PASUL 1)

---

### ✅ PASUL 3: Copiază Signing Secret

**După ce webhook-ul este creat:**

1. **Click pe webhook-ul pe care l-ai creat** (click pe numele sau URL-ul)
2. **Găsește secțiunea "Signing secret"**
3. **Click pe "Reveal"** sau **"Click to reveal"**
4. **COPIAZĂ secret-ul** - începe cu `whsec_...`

**Exemplu:**
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

**⚠️ IMPORTANT:** Salvează-l - vei avea nevoie de el în următorul pas!

---

### ✅ PASUL 4: Adaugă Signing Secret în Supabase

1. **Mergi la Supabase Dashboard**
2. **Settings** → **Edge Functions** (sau **API** → **Secrets**)
3. **Adaugă o variabilă de mediu:**
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** Secret-ul pe care l-ai copiat (`whsec_...`)
4. **Salvează**

**SAU via Dashboard:**
1. **Edge Functions** → **stripe-webhook**
2. **Settings** → **Environment Variables**
3. **Adaugă:** `STRIPE_WEBHOOK_SECRET` = `whsec_...`
4. **Save**

---

### ✅ PASUL 5: Verifică că funcționează

#### Test 1: Verifică în Stripe
1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click pe webhook-ul tău**
3. **Ar trebui să vezi:**
   - Status: "Enabled" (sau verde)
   - Ultimele evenimente (dacă există)

#### Test 2: Testează webhook-ul
1. **În pagina webhook-ului din Stripe**
2. **Click pe "Send test webhook"**
3. **Selectează:** `checkout.session.completed`
4. **Click "Send test webhook"**
5. **Verifică în Supabase:**
   - **Edge Functions** → **stripe-webhook** → **Logs**
   - Ar trebui să vezi loguri cu `🔔 WEBHOOK: Processing checkout.session.completed`

#### Test 3: Testează cu un checkout real
1. **Cumpără un plan** din aplicația ta
2. **După checkout**, verifică:
   - **Stripe Dashboard** → **Webhooks** → **Events** - ar trebui să vezi un eveniment nou
   - **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** - ar trebui să vezi loguri
   - **Supabase** → **SQL Editor** - rulează:
     ```sql
     SELECT plan, subscription_status, source 
     FROM user_subscriptions 
     WHERE user_id = 'YOUR_USER_ID'::uuid;
     ```
     - Planul ar trebui să fie actualizat (nu "free")

---

## 🐛 Probleme comune

### Problema: "Unable to reach endpoint" în Stripe
**Cauză:** Funcția nu este deploy-ată sau URL-ul este greșit

**Soluție:**
1. Verifică că funcția `stripe-webhook` există în Supabase Edge Functions
2. Verifică că URL-ul este corect (cu ID-ul corect al proiectului)
3. Verifică că URL-ul începe cu `https://`

### Problema: Webhook-ul nu primește evenimente
**Cauză:** Evenimentele nu sunt selectate corect

**Soluție:**
1. Verifică că ai selectat toate cele 5 evenimente
2. Verifică că webhook-ul este "Enabled"

### Problema: Eroare în loguri "Missing signature or webhook secret"
**Cauză:** `STRIPE_WEBHOOK_SECRET` nu este setat în Supabase

**Soluție:**
1. Verifică că ai adăugat variabila de mediu `STRIPE_WEBHOOK_SECRET` în Supabase
2. Verifică că secret-ul este corect (începe cu `whsec_`)
3. Redeploy funcția după ce ai adăugat secret-ul

### Problema: Webhook-ul primește evenimente dar planul nu se actualizează
**Cauză:** Eroare în procesarea webhook-ului

**Soluție:**
1. Verifică logurile din Supabase Edge Functions
2. Caută erori care încep cu `❌ WEBHOOK ERROR:`
3. Verifică că `metadata.supabase_user_id` și `metadata.plan` sunt setate în checkout session

---

## ✅ Checklist final

- [ ] Funcția `stripe-webhook` este deploy-ată în Supabase
- [ ] Webhook-ul este configurat în Stripe Dashboard
- [ ] URL-ul webhook-ului este corect
- [ ] Toate cele 5 evenimente sunt selectate
- [ ] `STRIPE_WEBHOOK_SECRET` este setat în Supabase
- [ ] Test webhook funcționează (vezi loguri în Supabase)
- [ ] Checkout real funcționează (planul se actualizează)

---

## 📞 Dacă tot nu funcționează

Trimite-mi:
1. **Screenshot** din Stripe Dashboard → Webhooks (pagina cu lista de webhook-uri)
2. **Screenshot** din Supabase → Edge Functions (lista de funcții)
3. **Logurile** din Supabase → Edge Functions → stripe-webhook → Logs
4. **Mesajul de eroare** exact (dacă există)

Cu aceste informații pot identifica exact problema! 🚀

