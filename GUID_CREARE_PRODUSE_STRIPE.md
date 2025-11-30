# 🛍️ Pas cu Pas: Crearea Produselor în Stripe (Pasul 2.1)

## ✅ Ești în test mode - PERFECT!

**Ești în test mode (butonul din colțul dreapta sus arată "Test mode")** - asta e perfect pentru început!

În test mode poți:
- ✅ Testa totul fără să plătești bani reali
- ✅ Folosi carduri de test
- ✅ Experimenta fără risc

---

## 📋 Pas cu Pas: Creează Primul Produs (Beginner Plan)

### Pasul 1: Accesează Produsele

1. **În Stripe Dashboard**, în meniul din stânga, găsește **"Products"**
2. **Click pe "Products"**
3. **Click pe butonul "Add product"** sau **"+ Add product"** (buton mare, verde/albastru)

---

### Pasul 2: Completează Informațiile Produsului

**În formularul care se deschide:**

#### 1. Name (Numele produsului)
- **Scrie**: `Beginner Plan`
- Sau: `Snacksy Beginner Plan`

#### 2. Description (Descrierea - opțional)
- **Scrie**: `40 meals per week, unlimited ingredients, advanced recipes`
- Sau lasă gol dacă vrei

#### 3. Images (Imagini - opțional)
- Poți să lași gol
- Sau poți adăuga o imagine dacă vrei

---

### Pasul 3: Adaugă Prețul

**În secțiunea "Pricing":**

1. **Click pe butonul "Add price"** sau **"+ Add price"**

**În formularul de preț:**

#### 1. Price (Prețul)
- **Scrie**: `4.99`
- Fără € sau alte simboluri, doar numărul

#### 2. Currency (Moneda)
- **Selectează**: `EUR` (Euro)
- Sau `USD` dacă vrei dolari

#### 3. Billing period (Perioada de facturare)
- **Selectează**: `Recurring` (Abonament recurent)
- **Frequency**: `Monthly` (Lunar)

#### 4. Billing period (opțional)
- Poți lăsa default

#### 5. Click pe **"Save"** sau **"Add price"**

---

### Pasul 4: Salvează Produsul

1. **Scroll în jos** (dacă e nevoie)
2. **Click pe butonul "Save product"** sau **"Add product"**

---

### Pasul 5: Copiază Price ID (FOARTE IMPORTANT!)

**După ce produsul este creat:**

1. **Vezi pagina produsului** (sau revino la lista de produse)
2. **Click pe produsul "Beginner Plan"** pe care l-ai creat
3. **Găsește secțiunea "Pricing"**
4. **Sub prețul €4.99**, vei vedea un **"Price ID"**
5. **Price ID-ul arată așa**: `price_1ABC123xyz...` (începe cu `price_`)
6. **Click pe Price ID** (sau click dreapta → Copy)
7. **COPIAZĂ-L** - Salvează-l într-un notepad/document

**Exemplu de Price ID:**
```
price_1OaBcDeFgHiJkLmNoPqRsTu
```

**⚠️ IMPORTANT:** Ai nevoie de acest Price ID în Pasul 4 (când adaugi secret-urile în Supabase)

---

## 🔄 Repetă pentru Celelalte 2 Produse

### Produs 2: Chef Plan

1. **Click pe "Add product"** din nou
2. **Name**: `Chef Plan`
3. **Description**: `80 meals per week, personalized suggestions, unlimited saved meals` (opțional)
4. **Add price**:
   - **Price**: `14.99`
   - **Currency**: `EUR`
   - **Billing**: `Recurring` → `Monthly`
5. **Save product**
6. **COPIAZĂ Price ID** (începe cu `price_...`)

### Produs 3: Unlimited Plan

1. **Click pe "Add product"** din nou
2. **Name**: `Unlimited Plan`
3. **Description**: `500 meals per week, all features, personalized themes` (opțional)
4. **Add price**:
   - **Price**: `29.99`
   - **Currency**: `EUR`
   - **Billing**: `Recurring` → `Monthly`
5. **Save product**
6. **COPIAZĂ Price ID** (începe cu `price_...`)

---

## ✅ Checklist Final

Ai nevoie de:

- [ ] **Beginner Plan** creat
- [ ] **Price ID pentru Beginner Plan** copiat (price_...)
- [ ] **Chef Plan** creat
- [ ] **Price ID pentru Chef Plan** copiat (price_...)
- [ ] **Unlimited Plan** creat
- [ ] **Price ID pentru Unlimited Plan** copiat (price_...)

**Salvează toate cele 3 Price ID-uri** într-un loc sigur - vei avea nevoie de ele!

---

## 🎯 Unde găsesc Price ID-ul?

**După ce ai creat produsul:**

1. **Mergi la Products** în Stripe Dashboard
2. **Click pe produsul creat**
3. **Scroll în jos** la secțiunea "Pricing"
4. **Sub preț** vei vedea:
   ```
   Price ID: price_1ABC123xyz...
   ```
5. **Click pe Price ID** pentru a-l copia

**SAU:**

1. **Mergi la Products**
2. **Click pe produsul creat**
3. **În sidebar-ul din dreapta** (sau în partea de jos), vei vedea informații despre produs
4. **Price ID** este acolo

---

## 🐛 Probleme comune

### Problema: Nu găsesc butonul "Add product"
**Soluție:**
- Verifică că ești în secțiunea "Products" (meniu stânga)
- Poate fi un buton mare verde/albastru sau "+" în colțul dreapta sus

### Problema: Nu pot adăuga preț
**Soluție:**
- Asigură-te că ai completat "Name" primul
- Încearcă să click pe "Add price" după ce ai salvat numele produsului

### Problema: Nu găsesc Price ID
**Soluție:**
- Click pe produsul creat din lista de produse
- Scroll în jos în pagina produsului
- Caută în secțiunea "Pricing" sau în sidebar
- Price ID-ul începe întotdeauna cu `price_`

### Problema: Vreau să editez un produs
**Soluție:**
- Click pe produs din lista de produse
- Click pe "Edit" sau iconița de edit
- Fă modificările
- Save

---

## 📝 Notițe

1. **Test Mode** - Ești în test mode, perfect pentru început
2. **Price ID-urile** - Sunt diferite pentru test mode vs live mode
3. **Când vei merge live** - Va trebui să creezi produsele din nou în live mode

---

**Următorul pas:** După ce ai toate cele 3 Price ID-uri, mergi la **Pasul 2.2: Configurarea Webhook-ului**

Spune-mi când ai terminat sau dacă ai întrebări! 🚀

