# 🔍 Debug: Failed to Start Checkout

## Pasul 1: Verifică Console-ul Browser-ului

1. **Deschide aplicația** în browser
2. **Apasă F12** (sau Click dreapta → Inspect)
3. **Click pe tab-ul "Console"**
4. **Încearcă din nou** să faci checkout
5. **Verifică erorile** în console - copiază-le și spune-mi ce vezi

---

## Pasul 2: Verifică Logs-urile Edge Function

1. **Mergi la Supabase Dashboard** → **Edge Functions**
2. **Click pe funcția** `create-checkout-session`
3. **Click pe tab-ul "Logs"** sau **"Invocation Logs"**
4. **Încearcă din nou** să faci checkout în aplicație
5. **Verifică logs-urile** - vei vedea eroarea exactă

**Caută erori care arată așa:**
- `Error creating checkout session: ...`
- `Price ID not configured...`
- `Unauthorized`
- `STRIPE_SECRET_KEY is not set`

---

## Pasul 3: Verifică Secret-urile

1. **Mergi la Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. **Verifică că ai toate aceste secret-uri:**

- [ ] `STRIPE_SECRET_KEY` - trebuie să fie `sk_test_...`
- [ ] `STRIPE_PRICE_ID_BEGINNER` - trebuie să fie `price_...`
- [ ] `STRIPE_PRICE_ID_CHEF` - trebuie să fie `price_...`
- [ ] `STRIPE_PRICE_ID_UNLIMITED` - trebuie să fie `price_...`

**⚠️ IMPORTANT:** 
- Verifică că nu ai spații înainte sau după valorile secret-urilor
- Verifică că Price ID-urile sunt din **Test Mode** (nu Live Mode)

---

## Pasul 4: Verifică că Edge Function este Deploy-ată

1. **Mergi la Supabase Dashboard** → **Edge Functions**
2. **Verifică că vezi** `create-checkout-session` în listă
3. **Verifică că status-ul** este "Active" sau "Deployed"

---

## Problema Comune #1: Price ID-urile sunt goale

**Soluție:**
- Verifică că ai adăugat secret-urile `STRIPE_PRICE_ID_BEGINNER`, etc.
- Verifică că valorile sunt corecte (încep cu `price_...`)

---

## Problema Comune #2: Stripe Secret Key lipsă sau greșit

**Soluție:**
- Verifică că `STRIPE_SECRET_KEY` este setat
- Verifică că începe cu `sk_test_...` (pentru test mode)
- Reia din Stripe Dashboard → Developers → API keys

---

## Problema Comune #3: Eroare de autentificare

**Soluție:**
- Verifică că ești logat în aplicație
- Verifică că sesiunea este validă
- Încearcă să te deloghezi și să te loghezi din nou

---

**Spune-mi ce vezi în logs-uri sau console și te ajut să rezolvăm problema!**

