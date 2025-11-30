# 🔧 Fix: Eroarea 401 "Unauthorized" în Stripe Webhook

## Problema

În Stripe Dashboard → Events, vezi eroarea **401 "Unauthorized"** când Stripe încearcă să trimită evenimente la webhook-ul tău.

**Cauză:** Supabase Edge Functions middleware blochează request-urile fără `Authorization` sau `apikey` header ÎNAINTE să ajungă la codul funcției.

---

## ✅ Soluția: Adaugă header-ul `apikey` în webhook-ul Stripe

### Pasul 1: Copiază Supabase Anon Key

**În Supabase Dashboard:**

1. **Settings** → **API**
2. **Caută "Project API keys"**
3. **Găsește "anon" / "public" key**
4. **COPIAZĂ key-ul** (începe cu `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**SAU** din codul tău (`src/integrations/supabase/client.ts`):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4dW13YXRic2FoYWxzY2Rycnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA1MjUsImV4cCI6MjA3MTU1NjUyNX0.0BizbWyDzYeB2gbq5GZW5kcyX3ev4DdXEcnXUXDEM6M
```

### Pasul 2: Configurează webhook-ul în Stripe cu header custom

**În Stripe Dashboard:**

1. **Developers** → **Webhooks**
2. **Click pe webhook-ul tău** ("AlPaymentSNKS")
3. **Click pe "Edit destination"** sau **"Settings"**
4. **Caută secțiunea "Headers"** sau **"Custom headers"**
5. **Adaugă header:**
   - **Key:** `apikey`
   - **Value:** Anon key-ul copiat (ex: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
6. **Save** sau **Update**

**⚠️ IMPORTANT:** 
- Dacă nu vezi opțiunea "Headers" sau "Custom headers", poate fi numită diferit
- Poate fi în secțiunea "Advanced" sau "Settings"
- Sau poate trebui să ștergi webhook-ul vechi și să creezi unul nou cu header-uri

### Pasul 3: Alternativă - Creează webhook nou cu header

**Dacă nu poți edita webhook-ul existent:**

1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click "Add endpoint"** sau **"Create destination"**
3. **Completează formularul:**
   - **Endpoint URL:** `https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook`
   - **Events:** Selectează toate evenimentele necesare
   - **Headers:** (dacă există opțiune)
     - **Key:** `apikey`
     - **Value:** Anon key-ul tău
4. **Save**
5. **Copiază Signing Secret-ul** nou
6. **Actualizează în Supabase:**
   - Edge Functions → Secrets
   - Actualizează `STRIPE_WEBHOOK_SECRET`

---

## 🔍 Verifică dacă funcționează

### Test 1: Trimite test event din Stripe

1. **Stripe Dashboard** → **Webhooks** → [Webhook-ul tău]
2. **Click "Send test event"**
3. **Selectează:** `checkout.session.completed`
4. **Click "Send"**
5. **Așteaptă 5-10 secunde**
6. **Verifică:**
   - **Stripe Dashboard** → **Events** → Status code ar trebui să fie **200** (nu 401)
   - **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** → Ar trebui să vezi loguri

### Test 2: Verifică evenimentele în Stripe

1. **Stripe Dashboard** → **Webhooks** → **Events**
2. **Click pe un eveniment recent**
3. **Verifică "Deliveries to webhook endpoints":**
   - Status code: Ar trebui să fie **200** (nu 401)
   - Response: Ar trebui să fie `{"received": true}`

---

## 🐛 Dacă nu găsești opțiunea "Headers" în Stripe

**Stripe Dashboard nu permite header-e custom în webhook-uri direct.**

**Soluția alternativă:** Trebuie să folosim un workaround.

### Opțiunea A: Folosește un reverse proxy (avansat)

Nu este recomandat pentru începători.

### Opțiunea B: Actualizează funcția să accepte request-uri fără auth (MAI SIMPLU)

Am actualizat funcția să detecteze request-uri Stripe și să returneze un mesaj clar dacă lipsește `apikey`.

**Totuși, middleware-ul Supabase blochează înainte.**

### Opțiunea C: Folosește Supabase Anon Key în URL (WORKAROUND)

**Nu este posibil** - Supabase nu acceptă key în URL.

---

## ✅ Soluția finală: Configurează Stripe CLI sau folosește webhook local

**Pentru testare rapidă:**

1. **Instalează Stripe CLI** (vezi `INSTALARE_STRIPE_CLI.md`)
2. **Forward webhook-uri local:**
   ```bash
   stripe listen --forward-to https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook --forward-connect-to https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
   ```
3. **Stripe CLI adaugă automat header-ele necesare**

**Pentru producție:**

Trebuie să contactezi support-ul Stripe sau să folosești un reverse proxy.

---

## 📝 Notă importantă

**Supabase Edge Functions cer `Authorization` sau `apikey` header pentru securitate.** 

Pentru webhook-uri Stripe, cea mai bună soluție este:
1. ✅ Adaugă `apikey` header în webhook (dacă Stripe permite)
2. ✅ Sau folosește Stripe CLI pentru testare
3. ✅ Sau contactează support-ul Stripe pentru header-e custom

---

## 🚨 Alternative: Fă funcția publică (NU RECOMANDAT)

**NU recomand** să faci funcția complet publică pentru securitate. Webhook-urile Stripe au `stripe-signature` pentru verificare, dar Supabase middleware blochează înainte.

---

**După ce ai configurat header-ul `apikey`, testează și spune-mi dacă funcționează!** 🚀

