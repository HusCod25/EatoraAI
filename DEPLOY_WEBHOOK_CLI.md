# 🚀 Deploy Webhook via CLI - Soluție finală

## Problema

Webhook-ul nu primește evenimente (401 Unauthorized) și nu există loguri în Supabase, deoarece configurația `verify_jwt = false` din `config.toml` nu se aplică când deploy-ezi prin Dashboard.

## ✅ Soluția: Deploy via CLI

Supabase aplică `config.toml` DOAR când deploy-ezi prin CLI, nu prin Dashboard.

---

## 📋 Pași pentru deploy via CLI

### Pasul 1: Verifică că ai Supabase CLI instalat

**În PowerShell:**

```powershell
npx supabase --version
```

**Dacă nu funcționează:**
- CLI-ul se va instala automat când rulezi comenzile

### Pasul 2: Login în Supabase

```powershell
npx supabase login
```

**Ce se va întâmpla:**
- Se va deschide browser-ul
- Te va conecta la contul Supabase
- După autentificare, CLI-ul va fi conectat

### Pasul 3: Link la proiect

```powershell
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"
npx supabase link --project-ref axumwatbsahalscdrryv
```

**Ce se va întâmpla:**
- CLI-ul va link-a local la proiectul Supabase
- Va crea un fișier `.supabase` cu configurația

### Pasul 4: Deploy funcția

```powershell
npx supabase functions deploy stripe-webhook
```

**Ce se va întâmpla:**
- CLI-ul va citi `config.toml`
- Va aplica `verify_jwt = false`
- Va deploy funcția cu configurația corectă

### Pasul 5: Verifică că funcționează

**În Stripe Dashboard:**

1. **Developers** → **Webhooks** → **AlPaymentSNKS**
2. **Click "Send test event"**
3. **Selectează:** `checkout.session.completed`
4. **Click "Send"**
5. **Așteaptă 5-10 secunde**
6. **Verifică:**
   - **Stripe Dashboard** → **Events** → Status code ar trebui să fie **200** (nu 401)
   - **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** → Ar trebui să vezi loguri

---

## 🔍 Verificări

### Verifică că config.toml este corect

Fișierul `supabase/config.toml` ar trebui să conțină:

```toml
project_id = "axumwatbsahalscdrryv"

[functions.stripe-webhook]
verify_jwt = false
```

### Verifică că deploy-ul a reușit

**După deploy, verifică în Supabase Dashboard:**

1. **Edge Functions** → **stripe-webhook**
2. **Verifică "Last deployed"** - ar trebui să fie recent
3. **Verifică "Status"** - ar trebui să fie "Active"

---

## ⚠️ Dacă apare eroare la deploy

### Eroare: "Not logged in"

**Soluție:**
```powershell
npx supabase login
```

### Eroare: "Project not linked"

**Soluție:**
```powershell
npx supabase link --project-ref axumwatbsahalscdrryv
```

### Eroare: "Function not found"

**Soluție:**
- Verifică că folder-ul `supabase/functions/stripe-webhook` există
- Verifică că `index.ts` există în folder

---

## ✅ Checklist

- [ ] Am făcut login cu `npx supabase login`
- [ ] Am link-at proiectul cu `npx supabase link --project-ref axumwatbsahalscdrryv`
- [ ] Am deploy-at funcția cu `npx supabase functions deploy stripe-webhook`
- [ ] Am verificat că deploy-ul a reușit în Supabase Dashboard
- [ ] Am testat webhook-ul din Stripe Dashboard
- [ ] Am verificat logurile în Supabase Dashboard

---

**După ce ai deploy-at via CLI, testează și spune-mi dacă funcționează!** 🚀

