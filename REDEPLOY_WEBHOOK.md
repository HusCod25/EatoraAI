# 🚀 Redeploy Webhook - Pași finali

## Problema

După ce am configurat `verify_jwt = false`, tot apare eroarea 401. Trebuie să:
1. ✅ Eliminăm verificarea manuală pentru `apikey` din cod (AM FĂCUT)
2. ✅ Redeploy funcția cu configurația corectă (TREBUIE SĂ FACI)

---

## ✅ Ce am făcut

Am eliminat verificarea manuală pentru `apikey` header din cod. Acum funcția acceptă request-uri cu `stripe-signature` fără să ceară `apikey`.

---

## 🚀 Ce trebuie să faci ACUM

### Pasul 1: Redeploy funcția

**IMPORTANT:** Trebuie să redeploy funcția pentru ca modificările să intre în vigoare!

**În Supabase Dashboard:**

1. **Edge Functions** → **stripe-webhook**
2. **Click pe "Deploy"** sau **"Save"** (sau "Redeploy")
3. **Așteaptă confirmarea** că funcția este deploy-ată

**SAU via CLI:**

```bash
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"
npx supabase functions deploy stripe-webhook
```

### Pasul 2: Verifică că configurația este aplicată

**În Supabase Dashboard:**

1. **Edge Functions** → **stripe-webhook** → **Settings**
2. **Verifică că există configurația** `verify_jwt = false`
3. **Dacă nu o vezi**, poți să o adaugi manual în Settings

### Pasul 3: Testează webhook-ul

**În Stripe Dashboard:**

1. **Developers** → **Webhooks** → **AlPaymentSNKS**
2. **Click pe "Send test event"** (sau "Resend" pentru evenimentul existent)
3. **Selectează:** `checkout.session.completed`
4. **Click "Send"**
5. **Așteaptă 5-10 secunde**
6. **Verifică:**
   - **Stripe Dashboard** → **Events** → Status code ar trebui să fie **200** (nu 401)
   - **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** → Ar trebui să vezi loguri

### Pasul 4: Dacă tot apare 401, forțează retry

**În Stripe Dashboard:**

1. **Developers** → **Webhooks** → **Events**
2. **Click pe evenimentul cu 401**
3. **Click pe "Resend"** (să trimită din nou)
4. **Așteaptă și verifică** status code-ul

---

## 🔍 Verificări suplimentare

### Verifică că `config.toml` este corect

Fișierul `supabase/config.toml` ar trebui să conțină:

```toml
project_id = "axumwatbsahalscdrryv"

[functions.stripe-webhook]
verify_jwt = false
```

### Verifică că funcția este redeploy-ată

**În Supabase Dashboard:**

1. **Edge Functions** → **stripe-webhook**
2. **Verifică "Last deployed"** - ar trebui să fie recent (după ce ai redeploy-at)
3. **Verifică "Status"** - ar trebui să fie "Active" sau "Deployed"

---

## ⚠️ Dacă tot nu funcționează

### Verifică logurile în Supabase

1. **Edge Functions** → **stripe-webhook** → **Logs**
2. **Caută erori** sau mesaje care încep cu `❌`
3. **Trimite-mi screenshot-ul** cu logurile

### Verifică evenimentele în Stripe

1. **Developers** → **Webhooks** → **Events**
2. **Click pe evenimentul cu 401**
3. **Verifică "Response"** - ar trebui să vezi mesajul exact de eroare
4. **Trimite-mi screenshot-ul** cu răspunsul

---

## ✅ Checklist final

- [ ] Am redeploy-at funcția `stripe-webhook`
- [ ] Am verificat că `config.toml` conține `verify_jwt = false`
- [ ] Am testat webhook-ul cu "Send test event" din Stripe
- [ ] Am verificat status code-ul în Stripe Dashboard (ar trebui să fie 200)
- [ ] Am verificat logurile în Supabase (ar trebui să vezi loguri noi)

---

**După ce ai redeploy-at funcția, testează din nou și spune-mi ce vezi!** 🚀

