# Ghid: Când să Ștergi Indexuri

## ⚠️ IMPORTANT: Nu Șterge Indexuri Fără Să Știi Ce Faci!

Indexurile cu `idx_scan = 0` NU înseamnă automat că sunt inutile!

---

## 🔒 Indexuri care NU TREBUIE ȘTERSE

### 1. Primary Key Indexes
- **Format:** `nume_tabel_pkey`
- **De ce:** Folosite automat de PostgreSQL pentru primary keys
- **Exemplu:** `user_subscriptions_pkey`, `profiles_pkey`

### 2. Unique Constraint Indexes
- **Format:** `nume_tabel_nume_coloana_key` sau `nume_tabel_nume_coloana_unique`
- **De ce:** Asigură unicitatea datelor
- **Exemplu:** `user_subscriptions_user_id_key`

### 3. Foreign Key Indexes
- **De ce:** Folosite pentru joins și verificări de integritate
- **Cum identifici:** Sunt legate de foreign key constraints

### 4. Indexuri Noi (Create Recent)
- **De ce:** Aplicația nu a fost folosită suficient pentru ca indexurile să fie utilizate
- **Recomandare:** Așteaptă cel puțin 1-2 săptămâni de utilizare activă

### 5. Indexuri pentru Query-uri Rare dar Importante
- **De ce:** Poate fi un query care rulează o dată pe săptămână/lună, dar e critic
- **Exemplu:** Rapoarte, backup-uri, admin queries

---

## ✅ Când POȚI Șterge un Index

### 1. Indexuri Duplicate
- Dacă ai 2+ indexuri pe aceeași coloană/coloane
- Păstrează doar cel mai eficient

### 2. Indexuri pentru Coloane Șterse
- Dacă ai șters o coloană dar indexul rămâne

### 3. Indexuri Experimentale
- Indexuri create pentru testare care nu au funcționat

### 4. Indexuri pentru Query-uri Care Nu Mai Există
- Dacă ai refactorizat codul și query-ul nu mai e folosit

---

## 📊 Cum Să Analizezi Indexurile

### Pasul 1: Rulează Aplicația Activat

**IMPORTANT:** Înainte de a decide să ștergi indexuri:

1. **Folosește aplicația activ** timp de cel puțin 1 săptămână
2. **Rulează toate funcționalitățile:**
   - Login/Register
   - Generare mese
   - Căutare ingrediente
   - Salvare mese
   - Admin panel (dacă ai)
   - Rapoarte/statistici

### Pasul 2: Verifică Din Nou

După utilizare activă, rulează din nou:

```sql
SELECT 
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Pasul 3: Analizează Query-urile

Verifică ce query-uri rulează în aplicație:

```sql
-- Vezi query-urile care rulează (dacă e activat pg_stat_statements)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time
FROM pg_stat_statements
WHERE schemaname = 'public'
ORDER BY calls DESC
LIMIT 20;
```

---

## 🎯 Recomandare pentru Snacksy

### Indexuri Probabil Importante (NU ȘTERGE):

1. **Primary Keys** - Toate tabelele au primary keys
2. **Foreign Keys** - `user_id`, `submitted_by`, etc.
3. **Unique Constraints** - `user_subscriptions_user_id_key`
4. **Indexuri pentru Search** - `idx_ingredients_search_cache_*`
5. **Indexuri pentru RLS** - Indexuri pe `user_id` pentru RLS policies
6. **Indexuri pentru Timestamps** - `created_at`, `updated_at` (pentru sortare)

### Indexuri Care Pot Fi Verificate (Șterge DOAR dacă ești sigur):

1. **Indexuri duplicate** pe aceeași coloană
2. **Indexuri experimentale** create pentru testare
3. **Indexuri pentru coloane șterse**

---

## 🔧 Script SQL pentru Analiză Sigură

```sql
-- Analiză detaliată indexuri - NU ȘTERGE automat!
SELECT 
  i.relname as tablename,
  i.indexrelname as indexname,
  i.idx_scan as scans,
  i.idx_tup_read as tuples_read,
  -- Verifică dacă e primary key
  CASE 
    WHEN i.indexrelname LIKE '%_pkey' THEN 'PRIMARY KEY'
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype IN ('p', 'u')
    ) THEN 'UNIQUE/PRIMARY'
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype = 'f'
    ) THEN 'FOREIGN KEY'
    ELSE 'REGULAR INDEX'
  END as index_type,
  -- Dimensiune index
  pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size
FROM pg_stat_user_indexes i
WHERE i.schemaname = 'public'
  AND i.idx_scan = 0  -- Doar indexuri neutilizate
ORDER BY 
  CASE 
    WHEN i.indexrelname LIKE '%_pkey' THEN 1
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype IN ('p', 'u', 'f')
    ) THEN 2
    ELSE 3
  END,
  i.relname,
  i.indexrelname;
```

---

## ✅ Checklist Înainte de Ștergere

Înainte să ștergi ORICE index, verifică:

- [ ] Nu e primary key
- [ ] Nu e unique constraint
- [ ] Nu e foreign key
- [ ] Nu e folosit de RLS policies
- [ ] Nu e folosit de triggers
- [ ] Aplicația a fost folosită activ timp de 1+ săptămâni
- [ ] Ai verificat că nu e folosit în query-uri rare dar importante
- [ ] Ai backup (dacă ești nesigur)

---

## 🎯 Recomandare Finală

**Pentru Snacksy:**

1. **NU ȘTERGE** indexuri acum - aplicația e nouă
2. **Folosește aplicația** activ timp de 1-2 săptămâni
3. **Rulează din nou** scriptul de verificare
4. **Analizează** doar indexurile care rămân cu 0 scans după utilizare activă
5. **Șterge** DOAR dacă ești 100% sigur că nu sunt folosite

**Indexurile ocupă puțin spațiu, dar pot face diferența între query rapid și lent!**

---

**Regula de aur:** Când ești în dubiu, NU ȘTERGE! 🛡️

