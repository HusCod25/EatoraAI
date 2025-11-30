# 📥 Instalare Stripe CLI pe Windows

## Metoda 1: Download direct (RECOMANDAT)

### Pasul 1: Descarcă Stripe CLI

1. **Mergi la:** https://github.com/stripe/stripe-cli/releases/latest
2. **Descarcă fișierul:** `stripe_X.X.X_windows_x86_64.zip`
   - X.X.X = versiunea (ex: `stripe_1.19.5_windows_x86_64.zip`)
3. **Dezarhivează** fișierul într-un folder (ex: `C:\stripe-cli\`)

### Pasul 2: Adaugă la PATH (opțional, dar recomandat)

1. **Click dreapta pe "This PC"** → **Properties**
2. **Click pe "Advanced system settings"**
3. **Click pe "Environment Variables"**
4. **În "System variables"**, caută "Path" și click **"Edit"**
5. **Click "New"** și adaugă folder-ul unde ai pus `stripe.exe` (ex: `C:\stripe-cli`)
6. **Click "OK"** pe toate ferestrele

### Pasul 3: Testează instalarea

Deschide un **PowerShell nou** și rulează:

```powershell
stripe --version
```

Dacă vezi versiunea, instalarea a reușit! ✅

---

## Metoda 2: Cu Scoop (dacă ai Scoop instalat)

```powershell
scoop install stripe
```

---

## Metoda 3: Cu Chocolatey (dacă ai Chocolatey instalat)

```powershell
choco install stripe
```

---

## După instalare: Login și test

### 1. Login în Stripe

```powershell
stripe login
```

**Ce se va întâmpla:**
- Se va deschide browser-ul
- Te va conecta la contul tău Stripe
- După autentificare, CLI-ul va fi conectat

### 2. Forward webhook-uri (pentru test local)

**Într-un terminal, rulează:**

```powershell
stripe listen --forward-to https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**⚠️ IMPORTANT:** 
- Înlocuiește `axumwatbsahalscdrryv` cu ID-ul tău real de proiect
- **Lăsă-l să ruleze** - va afișa evenimentele primite
- **COPIAZĂ signing secret-ul** (whsec_...) care apare

### 3. Trimite test event (într-un terminal nou)

```powershell
stripe trigger checkout.session.completed
```

### 4. Verifică logurile în Supabase

- Edge Functions → stripe-webhook → Logs
- Ar trebui să vezi loguri noi

---

## 🎯 Metoda simplă (fără CLI)

Dacă nu vrei să instalezi CLI-ul, poți testa direct cu un checkout real:

1. **Mergi la aplicația ta**
2. **Încearcă să cumperi un plan**
3. **Folosește cardul de test:** `4242 4242 4242 4242`
4. **Completează checkout-ul**
5. **Verifică logurile** în Supabase

---

## ✅ Ce metoda preferi?

1. **Instalez CLI-ul** și testez cu `stripe trigger`?
2. **Testez direct** cu un checkout real (mai simplu)?
3. **Am nevoie de ajutor** cu instalarea CLI-ului?

Spune-mi ce preferi! 🚀

