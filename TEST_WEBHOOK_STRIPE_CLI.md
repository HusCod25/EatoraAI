# 🧪 Testare Webhook cu Stripe CLI

## 📋 Pași pentru a testa webhook-ul cu Stripe CLI

### Pasul 1: Instalează Stripe CLI

**Windows:**
1. **Descarcă Stripe CLI** de aici: https://github.com/stripe/stripe-cli/releases/latest
2. **Descarcă fișierul** `stripe_X.X.X_windows_x86_64.zip` (sau versiunea pentru Windows)
3. **Dezarhivează** fișierul
4. **Extrage** `stripe.exe` într-un folder (ex: `C:\stripe-cli\`)
5. **Adaugă la PATH** (opțional, dar recomandat):
   - Click dreapta pe "This PC" → Properties → Advanced system settings
   - Environment Variables → System Variables → Path → Edit
   - Adaugă folder-ul unde ai pus `stripe.exe`

**SAU folosește Scoop (mai ușor):**
```powershell
scoop install stripe
```

**SAU folosește Chocolatey:**
```powershell
choco install stripe
```

### Pasul 2: Login în Stripe

Deschide PowerShell sau Command Prompt și rulează:

```bash
stripe login
```

**Ce se va întâmpla:**
- Stripe CLI va deschide browser-ul
- Va cere să te autentifici în Stripe
- După autentificare, va conecta CLI-ul la contul tău

### Pasul 3: Forward webhook-uri către funcția ta

**Important:** Trebuie să forward-ezi webhook-urile către funcția ta Supabase:

```bash
stripe listen --forward-to https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**⚠️ IMPORTANT:** 
- Înlocuiește `axumwatbsahalscdrryv` cu ID-ul tău real de proiect Supabase
- Această comandă va rula continuu și va afișa evenimentele primite
- **Lăs-o să ruleze** într-un terminal separat

**Ce vei vedea:**
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**⚠️ COPIAZĂ signing secret-ul** (whsec_...) - vei avea nevoie de el!

### Pasul 4: Setează signing secret-ul în Supabase

1. **Mergi la Supabase Dashboard** → **Edge Functions** → **Secrets**
2. **Actualizează** `STRIPE_WEBHOOK_SECRET` cu secret-ul de la CLI (whsec_...)
3. **SAU** rulează în alt terminal (după ce ai setat secret-ul în Supabase):

```bash
# Exportă secret-ul ca variabilă de mediu
$env:STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Pasul 5: Trimite test event

**Într-un terminal nou** (lasă primul terminal cu `stripe listen` să ruleze):

```bash
stripe trigger checkout.session.completed
```

**⚠️ IMPORTANT:** Folosește `checkout.session.completed`, nu `payment_intent.succeeded`!

### Pasul 6: Verifică rezultatul

**În terminalul cu `stripe listen`:**
- Ar trebui să vezi evenimentul primit
- Ar trebui să vezi răspunsul de la webhook-ul tău

**În Supabase Dashboard:**
1. **Edge Functions** → **stripe-webhook** → **Logs**
2. Ar trebui să vezi loguri cu `🔔 WEBHOOK: Processing checkout.session.completed`

---

## 🔄 Metoda alternativă (fără CLI)

Dacă nu vrei să instalezi CLI-ul, poți testa direct din Stripe Dashboard:

### Test cu checkout real:

1. **Mergi la aplicația ta**
2. **Încearcă să cumperi un plan**
3. **Folosește cardul de test:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25` (sau orice dată viitoare)
   - CVC: `123`
   - ZIP: `12345`
4. **Completează checkout-ul**
5. **Verifică logurile** în Supabase

---

## 🎯 Comenzi utile Stripe CLI

### Lista evenimentelor disponibile:
```bash
stripe trigger --help
```

### Trigger evenimente specifice:
```bash
# Checkout completat
stripe trigger checkout.session.completed

# Abonament creat
stripe trigger customer.subscription.created

# Abonament actualizat
stripe trigger customer.subscription.updated

# Abonament șters
stripe trigger customer.subscription.deleted

# Plată reușită
stripe trigger invoice.payment_succeeded

# Plată eșuată
stripe trigger invoice.payment_failed
```

### Verifică evenimentele primite:
```bash
# În terminalul cu `stripe listen`, vei vedea toate evenimentele
```

---

## ⚠️ Probleme comune

### Problema: "stripe: command not found"
**Soluție:** 
- Verifică că Stripe CLI este instalat
- Verifică că este în PATH
- Sau folosește path-ul complet către `stripe.exe`

### Problema: "Unable to forward to endpoint"
**Soluție:**
- Verifică că URL-ul este corect
- Verifică că funcția este deploy-ată în Supabase
- Verifică că nu ai firewall care blochează conexiunea

### Problema: "Webhook signature verification failed"
**Soluție:**
- Verifică că ai setat `STRIPE_WEBHOOK_SECRET` corect în Supabase
- Folosește signing secret-ul de la `stripe listen` (nu cel din Stripe Dashboard pentru test)
- Pentru producție, folosește signing secret-ul din Stripe Dashboard

---

## 📝 Note importante

1. **Signing Secret pentru test (CLI):**
   - Când folosești `stripe listen`, primești un signing secret diferit
   - Acesta este doar pentru test local
   - Pentru producție, folosește signing secret-ul din Stripe Dashboard

2. **Signing Secret pentru producție:**
   - Este cel din Stripe Dashboard → Webhooks → [Webhook-ul tău] → Signing secret
   - Acesta trebuie să fie setat în Supabase pentru producție

3. **Test vs Producție:**
   - CLI folosește test mode automat
   - Pentru producție, webhook-ul din Stripe Dashboard trimite evenimente reale

---

## ✅ Checklist

- [ ] Am instalat Stripe CLI
- [ ] Am făcut login cu `stripe login`
- [ ] Am pornit `stripe listen` cu URL-ul corect
- [ ] Am copiat signing secret-ul de la CLI
- [ ] Am setat `STRIPE_WEBHOOK_SECRET` în Supabase (pentru test)
- [ ] Am trimis test event cu `stripe trigger checkout.session.completed`
- [ ] Am verificat logurile în Supabase

---

**Dacă ai probleme, spune-mi ce eroare primești și te ajut!** 🚀

