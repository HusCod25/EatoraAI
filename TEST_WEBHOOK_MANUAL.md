# 🧪 Test Manual Webhook - Verificare rapidă

## Test rapid: Verifică dacă webhook-ul poate fi apelat

### Test 1: Verifică că endpoint-ul există

**În browser, accesează:**
```
https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**Ce ar trebui să vezi:**
- Un mesaj JSON cu `{"message": "Stripe webhook endpoint is active", ...}`
- SAU eroare 401 (e normal, înseamnă că funcția există)

**Dacă vezi 404:**
- Funcția nu este deploy-ată
- Redeploy funcția în Supabase Dashboard

### Test 2: Testează cu curl (opțional)

**În PowerShell sau Command Prompt:**

```powershell
# Test GET request
curl https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook

# Test POST request (simulare webhook)
curl -X POST https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook `
  -H "Content-Type: application/json" `
  -d '{"test": "data"}'
```

**Ce ar trebui să vezi:**
- Pentru GET: Mesaj JSON cu endpoint activ
- Pentru POST: Eroare despre missing signature (e normal, înseamnă că funcția există)

### Test 3: Verifică în Supabase că funcția există

**În Supabase Dashboard:**

1. **Edge Functions** → Lista de funcții
2. **Verifică că `stripe-webhook` este în listă**
3. **Status:** Ar trebui să fie "Active" sau "Deployed"
4. **Click pe funcție** → Verifică că codul este acolo

---

## 🚨 Dacă endpoint-ul nu răspunde (404)

### Redeploy funcția:

**Opțiunea A: Via Supabase Dashboard**

1. **Edge Functions** → **stripe-webhook** (sau "Create new function")
2. **Copiază codul** din `supabase/functions/stripe-webhook/index.ts`
3. **Lipește codul** în editor
4. **Click "Deploy"** sau **"Save"**

**Opțiunea B: Via CLI**

```powershell
# Asigură-te că ești în folderul proiectului
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"

# Login (dacă nu ești deja logat)
npx supabase login

# Link la proiect (dacă nu ești deja link-at)
npx supabase link --project-ref axumwatbsahalscdrryv

# Deploy funcția
npx supabase functions deploy stripe-webhook
```

---

## ✅ După ce ai verificat

Dacă endpoint-ul răspunde (nu 404), continuă cu verificările din `FIX_NO_LOGS_WEBHOOK.md`:
1. Verifică webhook-ul în Stripe Dashboard
2. Testează cu "Send test event"
3. Verifică evenimentele în Stripe

