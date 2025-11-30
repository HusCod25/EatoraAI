# 🔗 Cum să adaugi un Webhook Endpoint în Stripe

## ✅ BINE ȘTII: Ai deja un webhook configurat!
Din screenshot-ul tău, văd că ai deja un webhook numit "AlPaymentSNKS" care este Active și are URL-ul corect.

## Dacă vrei să adaugi un NOU endpoint (sau să înțelegi procesul):

### Pasul 1: Accesează Webhooks în Stripe
1. Mergi la **Stripe Dashboard**: https://dashboard.stripe.com
2. În meniul din stânga, click pe **"Developers"**
3. Click pe **"Webhooks"** (sau **"Event destinations"** în versiunea nouă)

### Pasul 2: Adaugă un nou endpoint
1. **Click pe butonul "Add endpoint"** sau **"+ Add endpoint"** sau **"Create destination"**
   - Este un buton mare, de obicei în partea de sus a paginii
   - Sau în centrul paginii dacă nu ai alte webhook-uri

2. **Se va deschide un formular** sau un modal cu câmpuri

### Pasul 3: Completează formularul

#### A. Endpoint URL:
În câmpul **"Endpoint URL"** sau **"URL"**, introdu:
```
https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**⚠️ IMPORTANT:** 
- Înlocuiește `axumwatbsahalscdrryv` cu ID-ul tău real de proiect Supabase
- URL-ul trebuie să fie exact: `https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook`

#### B. Nume (opțional):
Poți da un nume webhook-ului, de exemplu:
- `Snacksy Webhook`
- `Payment Webhook`
- Sau lasă-l pe cel default

#### C. Events to send (FOARTE IMPORTANT!):
Selectează evenimentele pe care vrei să le asculți:

**Opțiunea 1: Selectare rapidă**
- Click pe **"Select events"** sau **"Listening to"**
- Selectează categoria **"Customer subscription events"** (sau caută manual)
- Bifează:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `customer.subscription.created`
- Selectează categoria **"Invoice events"** sau **"Payment events"**
- Bifează:
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.payment_failed`

**Opțiunea 2: Selectare manuală**
- Click pe dropdown-ul "Select events"
- Caută fiecare eveniment în bara de căutare
- Bifează fiecare eveniment

#### D. API Version:
- Lasă-l pe cel default (de obicei cel mai recent)
- Sau selectează `2025-10-29.clover` (sau mai recent)

### Pasul 4: Salvează
1. **Verifică că toate câmpurile sunt corecte**
2. **Click pe "Add endpoint"** sau **"Create destination"** sau **"Save"**

### Pasul 5: Copiază Signing Secret
**După ce webhook-ul este creat:**

1. **Click pe webhook-ul pe care l-ai creat** (sau vezi-l în listă)
2. **În secțiunea "Signing secret"**:
   - Click pe **iconița de ochi** (👁️) pentru a revela secret-ul
   - Sau click pe **"Reveal"**
3. **COPIAZĂ secret-ul** - începe cu `whsec_...`
   - Exemplu: `whsec_1234567890abcdefghijklmnopqrstuvwxyz`

**⚠️ IMPORTANT:** 
- Acest secret este FOARTE IMPORTANT pentru securitate
- Vei avea nevoie de el pentru a-l seta în Supabase
- Salvează-l într-un loc sigur

---

## 🔍 Verifică webhook-ul existent

Din screenshot-ul tău, văd că ai deja un webhook configurat. Verifică:

### 1. Evenimentele selectate
1. **Click pe webhook-ul "AlPaymentSNKS"**
2. **Click pe "Show"** lângă "Listening to: 6 events"
3. **Verifică că ai aceste evenimente:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ (și eventual `customer.subscription.created`)

### 2. Signing Secret
1. **În secțiunea "Signing secret"**
2. **Click pe iconița de ochi** (👁️) pentru a revela secret-ul
3. **COPIAZĂ secret-ul** (dacă nu l-ai copiat deja)
4. **Verifică în Supabase** că este setat:
   - Mergi la **Edge Functions** → **stripe-webhook** → **Settings** → **Environment Variables**
   - Verifică că există `STRIPE_WEBHOOK_SECRET` cu valoarea corectă

### 3. Testează webhook-ul
1. **Click pe butonul "Send test events"** (în partea de sus dreapta)
2. **Selectează un eveniment** (ex: `checkout.session.completed`)
3. **Click "Send test event"**
4. **Verifică în Supabase**:
   - Mergi la **Edge Functions** → **stripe-webhook** → **Logs**
   - Ar trebui să vezi loguri cu `🔔 WEBHOOK: Processing checkout.session.completed`

---

## 🐛 Dacă nu vezi butonul "Add endpoint"

**În versiunea nouă a Stripe Dashboard:**
- Butonul poate fi numit **"Create destination"** sau **"+ Create"**
- Sau poate fi în partea de sus dreapta
- Sau poate fi un iconiță **"+"** în colțul paginii

**În versiunea veche:**
- Butonul este **"Add endpoint"** sau **"+ Add endpoint"**
- Este de obicei în partea de sus a paginii

---

## 📸 Locuri unde poate fi butonul

1. **În partea de sus a paginii** (centru sau dreapta)
2. **În sidebar-ul din stânga** (dacă există)
3. **În partea de sus dreapta** (lângă butoanele de settings)
4. **În centrul paginii** (dacă nu ai alte webhook-uri)

---

## ✅ Checklist

- [ ] Am găsit butonul "Add endpoint" / "Create destination"
- [ ] Am introdus URL-ul corect
- [ ] Am selectat toate evenimentele necesare (minim 5)
- [ ] Am salvat webhook-ul
- [ ] Am copiat Signing Secret-ul
- [ ] Am setat Secret-ul în Supabase
- [ ] Am testat webhook-ul (vezi loguri în Supabase)

---

## 💡 Recomandare

**Deoarece ai deja un webhook configurat**, mai bine:
1. **Verifică evenimentele** selectate în webhook-ul existent
2. **Copiază Signing Secret-ul** (dacă nu l-ai copiat)
3. **Verifică că este setat în Supabase**
4. **Testează webhook-ul** cu "Send test events"

Nu trebuie să creezi un webhook nou dacă deja ai unul configurat corect! 🚀

