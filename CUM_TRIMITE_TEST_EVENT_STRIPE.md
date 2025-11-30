# 🧪 Cum să trimiți un Test Event în Stripe

## 📋 Pași detaliați:

### Pasul 1: Accesează Webhook-ul în Stripe Dashboard

1. **Mergi la Stripe Dashboard**: https://dashboard.stripe.com
2. **Asigură-te că ești în "Test mode"** (buton în colțul din dreapta sus)
3. **Mergi la Developers** (meniul din stânga)
4. **Click pe "Webhooks"** (sau "Event destinations" în versiunea nouă)
5. **Click pe webhook-ul tău** ("AlPaymentSNKS") - click pe numele sau URL-ul webhook-ului

### Pasul 2: Găsește butonul "Send test event"

**Butonul poate fi în mai multe locuri:**

#### Opțiunea A: În partea de sus dreapta
- În pagina webhook-ului, în partea de sus dreapta, ar trebui să vezi butonul **"Send test event"** sau **"Send test events"**
- Sau un buton cu iconița **"▶️"** (play)

#### Opțiunea B: În tab-ul "Overview"
- După ce ai click pe webhook-ul tău, vei fi în tab-ul "Overview"
- Caută butonul **"Send test event"** în partea de sus a paginii

#### Opțiunea C: În meniul de acțiuni
- Poate fi un dropdown cu opțiuni, inclusiv "Send test event"

### Pasul 3: Selectează evenimentul

1. **Click pe "Send test event"**
2. **Se va deschide un modal sau un dropdown** cu opțiuni
3. **Selectează evenimentul:** `checkout.session.completed`
   - Poate fi într-o listă dropdown
   - Sau poate trebui să-l cauți în bara de căutare

### Pasul 4: Trimite evenimentul

1. **După ce ai selectat evenimentul**, click pe **"Send test event"** sau **"Send"**
2. **Așteaptă confirmarea** - Stripe va trimite evenimentul

### Pasul 5: Verifică rezultatul

**În Stripe Dashboard:**
- După câteva secunde, ar trebui să vezi un mesaj de succes
- Sau poți merge la tab-ul **"Event deliveries"** pentru a vedea evenimentele trimise

**În Supabase Dashboard:**
1. **Mergi la Supabase Dashboard** → **Edge Functions** → **stripe-webhook**
2. **Click pe "Logs"** (sau "View logs")
3. **Ar trebui să vezi loguri noi** care încep cu:
   - `🔔 WEBHOOK: Processing checkout.session.completed`
   - Sau `❌ WEBHOOK ERROR:` (dacă există o problemă)

---

## 🎯 Alternativă: Testează cu un checkout real

Dacă nu găsești butonul "Send test event", poți testa cu un checkout real:

### Test cu card de test Stripe:

1. **Mergi la aplicația ta** (local sau deployed)
2. **Încearcă să cumperi un plan**
3. **Folosește cardul de test Stripe:**
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** Orice dată viitoare (ex: `12/25`)
   - **CVC:** Orice 3 cifre (ex: `123`)
   - **ZIP:** Orice 5 cifre (ex: `12345`)

4. **Completează checkout-ul**
5. **După ce se completează**, verifică:
   - **Stripe Dashboard** → **Webhooks** → **Events** - ar trebui să vezi un eveniment nou
   - **Supabase** → **Edge Functions** → **stripe-webhook** → **Logs** - ar trebui să vezi loguri

---

## 📸 Cum arată butonul (descriere)

Butonul "Send test event" poate arăta astfel:
- Un buton verde cu textul "Send test event"
- Un buton albastru cu iconița play (▶️)
- Un dropdown cu opțiunea "Send test event"
- În versiunea nouă a Stripe, poate fi un buton cu "Test webhook" sau "Send test webhook"

---

## 🐛 Dacă nu găsești butonul

**Posibile motive:**

1. **Ești în modul "Live mode"** în loc de "Test mode"
   - **Soluție:** Click pe butonul din colțul din dreapta sus și schimbă la "Test mode"

2. **Webhook-ul nu este activ**
   - **Soluție:** Verifică că webhook-ul este "Active" sau "Enabled"

3. **Nu ai permisiuni**
   - **Soluție:** Asigură-te că ești logat cu contul corect

4. **Versiunea Stripe Dashboard**
   - **Soluție:** Încearcă să accesezi direct pagina de events: Stripe → Developers → Webhooks → [Webhook-ul tău] → Tab "Events" → Click pe "Send test event"

---

## ✅ Checklist

- [ ] Am accesat Stripe Dashboard → Developers → Webhooks
- [ ] Am click pe webhook-ul meu
- [ ] Am găsit butonul "Send test event"
- [ ] Am selectat evenimentul `checkout.session.completed`
- [ ] Am trimis evenimentul
- [ ] Am verificat logurile în Supabase

---

## 📞 Dacă tot nu funcționează

Trimite-mi:
1. **Screenshot** din pagina webhook-ului din Stripe
2. **Ce butoane vezi** în partea de sus a paginii
3. **Dacă vezi tab-ul "Events"** sau "Event deliveries"

Și îți voi arăta exact unde să click! 🚀

