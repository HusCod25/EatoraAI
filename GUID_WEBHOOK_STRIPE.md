# 🔗 Pas cu Pas: Configurare Stripe Webhook (Pasul 2.2)

## Ce face un webhook?

Webhook-ul Stripe trimite evenimente către aplicația ta când se întâmplă lucruri importante:
- ✅ Când un utilizator plătește (checkout completat)
- ✅ Când un abonament se actualizează
- ✅ Când un abonament se anulează
- ✅ Când o plată eșuează

Fără webhook, aplicația ta nu ar ști când utilizatorii plătesc!

---

## 📋 Pași detaliați:

### Pasul 1: Accesează Webhooks în Stripe

1. **Mergi la Stripe Dashboard**: https://dashboard.stripe.com
2. **Autentifică-te** (dacă nu ești deja logat)
3. **În meniul din stânga**, găsește secțiunea **"Developers"**
4. **Click pe "Developers"** → se va deschide un submeniu
5. **Click pe "Webhooks"**

**Ce vei vedea:**
- O pagină cu lista de webhook-uri (probabil goală dacă e prima dată)
- Un buton mare **"Add endpoint"** sau **"+ Add endpoint"**

---

### Pasul 2: Adaugă un nou webhook endpoint

1. **Click pe butonul "Add endpoint"** sau **"+ Add endpoint"**

**Ce se va deschide:**
- Un formular cu câmpuri pentru a configura webhook-ul

---

### Pasul 3: Completează URL-ul endpoint-ului

**În câmpul "Endpoint URL", introdu:**

```
https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook
```

**Explicație:**
- `axumwatbsahalscdrryv` = ID-ul proiectului tău Supabase
- `functions/v1/stripe-webhook` = funcția Edge Function pe care am creat-o

**⚠️ IMPORTANT:** 
- Dacă ai un alt project ID Supabase, înlocuiește `axumwatbsahalscdrryv` cu ID-ul tău
- Găsești ID-ul în URL-ul Supabase Dashboard (ex: `https://supabase.com/dashboard/project/axumwatbsahalscdrryv`)

---

### Pasul 4: Selectează evenimentele (events)

**În secțiunea "Events to send"**, trebuie să selectezi aceste evenimente:

#### ✅ Evenimente obligatorii:

1. **`checkout.session.completed`**
   - Când: Utilizatorul completează checkout-ul cu succes
   - De ce: Pentru a activa abonamentul în baza de date

2. **`customer.subscription.created`**
   - Când: Se creează un nou abonament
   - De ce: Pentru a sincroniza abonamentul

3. **`customer.subscription.updated`**
   - Când: Abonamentul se schimbă (plan, status, etc.)
   - De ce: Pentru a actualiza abonamentul în baza de date

4. **`customer.subscription.deleted`**
   - Când: Abonamentul este anulat
   - De ce: Pentru a downgrade utilizatorul la planul free

5. **`invoice.payment_succeeded`**
   - Când: O plată reușește (plăți lunare)
   - De ce: Pentru a prelungi abonamentul

6. **`invoice.payment_failed`**
   - Când: O plată eșuează
   - De ce: Pentru a marca abonamentul ca "past_due"

#### Cum să le selectezi:

**Opțiunea 1: Selectare manuală**
- Click pe dropdown-ul "Select events"
- Caută fiecare eveniment în listă
- Bifează fiecare eveniment

**Opțiunea 2: Selectare rapidă**
- Click pe **"Select events to listen to"**
- Caută secțiunea **"Customer subscription events"** → Selectează toate
- Caută secțiunea **"Payment events"** → Selectează `invoice.payment_succeeded` și `invoice.payment_failed`
- Caută secțiunea **"Checkout events"** → Selectează `checkout.session.completed`

---

### Pasul 5: Salvează webhook-ul

1. **Verifică că URL-ul este corect**
2. **Verifică că toate evenimentele sunt selectate**
3. **Click pe butonul "Add endpoint"** sau **"Save"**

**Ce se va întâmpla:**
- Webhook-ul va fi creat
- Stripe va încerca să trimită un eveniment de test (webhook ping)
- Vei vedea un mesaj de succes

---

### Pasul 6: Copiază Signing Secret (FOARTE IMPORTANT!)

**După ce webhook-ul este creat:**

1. **Vezi lista de webhook-uri** (ar trebui să vezi noul tău webhook)
2. **Click pe webhook-ul pe care l-ai creat** (click pe numele sau URL-ul)
3. **Găsește secțiunea "Signing secret"**
4. **Click pe butonul "Reveal"** sau **"Click to reveal"** lângă Signing secret
5. **Copiază secret-ul** - începe cu `whsec_...`

**⚠️ IMPORTANT:** 
- Acest secret este FOARTE IMPORTANT pentru securitate
- Stripe îl folosește pentru a verifica că evenimentele chiar vin de la Stripe
- **COPIAZĂ-L ACUM** - vei avea nevoie de el în Pasul 4 (adaugarea secret-urilor în Supabase)
- Salvează-l într-un loc sigur (notepad, notes, etc.)

**Exemplu de signing secret:**
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

---

### Pasul 7: Testează webhook-ul (opțional, dar recomandat)

1. **În pagina webhook-ului**, găsește butonul **"Send test webhook"**
2. **Selectează un eveniment** (ex: `checkout.session.completed`)
3. **Click "Send test webhook"**
4. **Verifică în Supabase**:
   - Mergi la Supabase Dashboard → Edge Functions → Logs
   - Ar trebui să vezi un log pentru funcția `stripe-webhook`

**Dacă vezi erori:**
- Verifică că Edge Function `stripe-webhook` este deploy-ată
- Verifică că URL-ul este corect
- Verifică că signing secret-ul este setat corect în Supabase

---

## ✅ Checklist

- [ ] Am accesat Stripe Dashboard → Developers → Webhooks
- [ ] Am click pe "Add endpoint"
- [ ] Am introdus URL-ul: `https://axumwatbsahalscdrryv.supabase.co/functions/v1/stripe-webhook`
- [ ] Am selectat toate cele 6 evenimente
- [ ] Am salvat webhook-ul
- [ ] Am copiat Signing secret-ul (whsec_...)
- [ ] Am salvat secret-ul într-un loc sigur

---

## 🐛 Probleme comune

### Problema: "Unable to reach endpoint"
**Cauză:** Edge Function nu este deploy-ată încă
**Soluție:** 
- Deploy Edge Function `stripe-webhook` mai întâi (Pasul 5)
- Sau continuă cu pașii, vei deploy-a mai târziu

### Problema: "Invalid URL"
**Cauză:** URL-ul este greșit
**Soluție:**
- Verifică că nu ai spații în URL
- Verifică că ID-ul proiectului Supabase este corect
- Verifică că URL-ul începe cu `https://`

### Problema: Nu găsesc evenimentele
**Cauză:** Evenimentele sunt în categorii diferite
**Soluție:**
- Folosește bara de căutare pentru a căuta fiecare eveniment
- Sau selectează "Select all events" temporar (nu recomandat pentru producție)

---

## 📝 Notițe importante

1. **Signing Secret** - COPIAZĂ-L ACUM! Vei avea nevoie de el în următorul pas
2. **Test Mode** - Asigură-te că ești în "Test mode" în Stripe (buton în colțul din dreapta sus)
3. **URL-ul trebuie să fie accesibil public** - Stripe trebuie să poată face request-uri către el

---

**Următorul pas:** După ce ai copiat Signing secret-ul, mergi la **Pasul 4: Adaugă Secret-urile în Supabase**

Dacă ai întrebări sau probleme, spune-mi! 🚀

