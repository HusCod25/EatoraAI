# 🔄 Cum să Redenumești Funcțiile în Supabase

## Opțiunea 1: Șterge și Recreează (Recomandat)

### Pasul 1: Șterge funcțiile existente

1. **Mergi la Supabase Dashboard** → **Edge Functions**
2. **Click pe funcția** `rapid-task`
3. **Click pe butonul "Delete"** sau "..." (meniu) → "Delete"
4. **Confirmă ștergerea**
5. **Repetă pentru** `dynamic-endpoint`

---

### Pasul 2: Creează `create-checkout-session` cu numele corect

1. **Click pe "Create a new function"** sau **"+ Create function"**
2. **Function name**: **IMPORTANT** - scrie exact: `create-checkout-session`
   - Fără spații
   - Doar litere mici și cratime
   - **NU** accepta numele sugerat de Supabase!
3. **Copiază codul** din `supabase/functions/create-checkout-session/index.ts`
4. **Lipește în editor**
5. **Click "Deploy"**

---

### Pasul 3: Creează `stripe-webhook` cu numele corect

1. **Click pe "Create a new function"** sau **"+ Create function"**
2. **Function name**: **IMPORTANT** - scrie exact: `stripe-webhook`
   - Fără spații
   - Doar litere mici și cratime
   - **NU** accepta numele sugerat de Supabase!
3. **Copiază codul** din `supabase/functions/stripe-webhook/index.ts`
4. **Lipește în editor**
5. **Click "Deploy"**

---

### Pasul 4: Actualizează codul frontend

1. **Deschide** `src/components/PricingDialog.tsx`
2. **Schimbă** `rapid-task` înapoi la `create-checkout-session`:
   ```typescript
   const { data, error } = await supabase.functions.invoke('create-checkout-session', {
   ```

---

### Pasul 5: Actualizează webhook-ul în Stripe

1. **Mergi la Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click pe webhook-ul tău**
3. **Actualizează Endpoint URL**:
   - Schimbă de la: `.../functions/v1/dynamic-endpoint`
   - La: `.../functions/v1/stripe-webhook`
4. **Click "Save"**

---

## Opțiunea 2: Folosește CLI (Dacă ai Supabase CLI)

```bash
# Install Supabase CLI (dacă nu ai)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref axumwatbsahalscdrryv

# Deploy cu numele corect
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

---

## ✅ Checklist Final

- [ ] Am șters `rapid-task` și `dynamic-endpoint`
- [ ] Am creat `create-checkout-session` cu codul corect
- [ ] Am creat `stripe-webhook` cu codul corect
- [ ] Am actualizat `PricingDialog.tsx` să folosească `create-checkout-session`
- [ ] Am actualizat webhook-ul în Stripe să folosească `stripe-webhook`

---

**Important:** Când creezi funcțiile, **NU** accepta numele sugerate de Supabase! Scrie manual numele exact: `create-checkout-session` și `stripe-webhook`.

















