# Tutorial: Deploy Manual Migrări Fix-uri 5-10

Acest tutorial te ghidează pas cu pas pentru a aplica manual migrările în Supabase.

## 📋 Pași Pre-Deployment

### Pasul 1: Verifică Conexiunea la Supabase

1. Deschide browser-ul și mergi la: https://supabase.com/dashboard
2. Loghează-te în contul tău
3. Selectează proiectul **Snacksy**
4. Mergi la **SQL Editor** (din meniul din stânga)

---

## 🚀 Pasul 2: Aplică Migrările (Una câte Una)

### ⚠️ IMPORTANT: Aplică migrările în ordine!

### Migrația 1: Backup & Data Integrity

1. În **SQL Editor**, click pe **New Query**
2. Deschide fișierul: `supabase/migrations/20250124000001_fix5_backup_data_integrity.sql`
3. Copiază **tot conținutul** fișierului
4. Lipește în SQL Editor
5. Click pe **Run** (sau apasă `Ctrl+Enter`)
6. Așteaptă mesajul de succes: ✅ "Success. No rows returned"

**Dacă apare eroare:**
- Verifică dacă ai copiat tot codul
- Verifică dacă nu există deja tabelele (poți sări peste dacă apar erori de "already exists")

---

### Migrația 2: Security Hardening

1. Click pe **New Query** (sau șterge conținutul anterior)
2. Deschide: `supabase/migrations/20250124000002_fix6_security_hardening.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Așteaptă mesajul de succes

**Dacă apare eroare:**
- Verifică dacă tabelele există deja
- Dacă apare eroare la policies, poți sări peste (DROP POLICY IF EXISTS ar trebui să rezolve)

---

### Migrația 3: Ingredient System Optimization

1. Click pe **New Query**
2. Deschide: `supabase/migrations/20250124000003_fix7_ingredient_system_optimization.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Așteaptă mesajul de succes

**Dacă apare eroare:**
- Verifică dacă funcțiile există deja
- Dacă apare eroare la trigger, poți sări peste (DROP TRIGGER IF EXISTS ar trebui să rezolve)

---

### Migrația 4: Profile & Subscription Validation

1. Click pe **New Query**
2. Deschide: `supabase/migrations/20250124000004_fix8_profile_subscription_validation.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Așteaptă mesajul de succes

**Dacă apare eroare:**
- Verifică dacă funcțiile există deja
- Dacă apare eroare la trigger, poți sări peste

---

### Migrația 5: Error Tracking Stabilization

1. Click pe **New Query**
2. Deschide: `supabase/migrations/20250124000005_fix9_error_tracking_stabilization.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Așteaptă mesajul de succes

**Dacă apare eroare:**
- Verifică dacă tabelul `error_logs` există
- Dacă apare eroare la ALTER TABLE, verifică dacă coloanele există deja

---

### Migrația 6: Performance Optimization

1. Click pe **New Query**
2. Deschide: `supabase/migrations/20250124000006_fix10_performance_optimization.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Așteaptă mesajul de succes

**Dacă apare eroare:**
- Verifică dacă tabelele există deja
- Dacă apare eroare la materialized view, poți sări peste

---

## 🔄 Pasul 3: Reîmprospătează Materialized View

După ce ai aplicat toate migrările, trebuie să reîmprospătezi materialized view-ul pentru search:

1. În **SQL Editor**, click pe **New Query**
2. Rulează următoarea comandă:

```sql
SELECT public.refresh_ingredients_search_cache();
```

3. Click pe **Run**
4. Așteaptă mesajul de succes

---

## ✅ Pasul 4: Verifică Implementarea

### Opțiune Rapidă: Script de Verificare Completă

Pentru o verificare rapidă, folosește scriptul `VERIFICA_DEPLOY.sql`:

1. În **SQL Editor**, click pe **New Query**
2. Deschide fișierul: `VERIFICA_DEPLOY.sql`
3. Copiază **tot conținutul**
4. Lipește în SQL Editor
5. Click pe **Run**
6. Verifică rezultatele - ar trebui să vezi ✅ pentru toate verificările

---

### Verificare Manuală: Tabele Noi

Dacă preferi să verifici manual, rulează următoarea interogare:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE 'backup_%' 
  OR table_name LIKE 'api_abuse%' 
  OR table_name = 'query_cache'
  OR table_name = 'stripe_fraud_checks'
)
ORDER BY table_name;
```

**Rezultat așteptat:** Ar trebui să vezi:
- `backup_profiles`
- `backup_user_subscriptions`
- `backup_user_activity`
- `backup_generated_meals`
- `api_abuse_log`
- `query_cache`
- `stripe_fraud_checks`

---

### Verifică Funcții Noi

Rulează următoarea interogare pentru a verifica funcțiile:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
  routine_name LIKE '%backup%' 
  OR routine_name LIKE '%cache%'
  OR routine_name LIKE '%fraud%'
  OR routine_name LIKE '%validate%'
  OR routine_name LIKE '%normalize%'
  OR routine_name LIKE '%aggregate%'
)
ORDER BY routine_name;
```

**Rezultat așteptat:** Ar trebui să vezi multe funcții noi, inclusiv:
- `backup_all_critical_tables`
- `get_cached_data`
- `check_stripe_fraud`
- `validate_user_subscription`
- `normalize_ingredient_name`
- `aggregate_error`
- etc.

---

### Verifică Materialized View

Rulează următoarea interogare:

```sql
SELECT * FROM pg_matviews 
WHERE matviewname = 'ingredients_search_cache';
```

**Rezultat așteptat:** Ar trebui să vezi un rând cu `ingredients_search_cache`

---

### Testează O Funcție Simplă

Testează funcția de normalizare nume ingrediente:

```sql
SELECT public.normalize_ingredient_name('Fresh Organic Chicken Breast');
```

**Rezultat așteptat:** `chicken breast`

---

## 🧪 Pasul 5: Testează Funcționalitățile

### Test 1: Backup (Admin Only)

Dacă ai plan admin, testează backup-ul:

```sql
SELECT public.backup_all_critical_tables();
```

**Rezultat așteptat:** JSON cu numărul de înregistrări backup-ate

---

### Test 2: Search Optimizat

Testează search-ul optimizat de ingrediente:

```sql
SELECT * FROM public.search_ingredients_optimized('chicken', 5);
```

**Rezultat așteptat:** Listă de ingrediente care conțin "chicken"

---

### Test 3: Cache

Testează cache-ul:

```sql
-- Setează cache
SELECT public.set_cached_data('test_key', '{"test": "data"}'::jsonb, 60);

-- Obține cache
SELECT public.get_cached_data('test_key', 60);
```

**Rezultat așteptat:** JSON cu `{"test": "data"}`

---

## 🐛 Rezolvare Probleme Comune

### Eroare: "relation already exists"

**Soluție:** Tabelul/funcția există deja. Poți:
- Sări peste acea linie
- Sau să rulezi `DROP TABLE IF EXISTS nume_tabel;` înainte

---

### Eroare: "permission denied"

**Soluție:** Verifică dacă ești logat ca admin sau dacă ai permisiuni suficiente în Supabase.

---

### Eroare: "function does not exist"

**Soluție:** Verifică dacă ai aplicat migrările în ordine. Unele funcții depind de altele.

---

### Eroare: "column does not exist"

**Soluție:** Verifică dacă ai aplicat migrația care adaugă coloana. Unele migrări adaugă coloane la tabele existente.

---

## 📝 Checklist Final

După ce ai terminat, verifică:

- [ ] Toate cele 6 migrări au fost aplicate cu succes
- [ ] Materialized view a fost reîmprospătat
- [ ] Tabelele noi există (verificat cu query)
- [ ] Funcțiile noi există (verificat cu query)
- [ ] Materialized view există (verificat cu query)
- [ ] Teste simple funcționează
- [ ] Frontend-ul folosește noile funcții (verifică în browser console)

---

## 🎯 Pași Următori (Opțional)

### Configurare Cron Jobs (Pentru Automatizare)

Dacă vrei să automatizezi anumite task-uri, poți configura cron jobs în Supabase:

1. Mergi la **Database** → **Cron Jobs**
2. Adaugă job-uri pentru:
   - Reîmprospătare materialized view (zilnic)
   - Curățare cache expirat (zilnic)
   - Backup automat (săptămânal - opțional)

**Exemplu cron job pentru refresh materialized view (zilnic la 2 AM):**

```sql
SELECT cron.schedule(
  'refresh-ingredients-cache',
  '0 2 * * *', -- La 2 AM zilnic
  $$SELECT public.refresh_ingredients_search_cache();$$
);
```

**Exemplu cron job pentru clear cache (zilnic la 3 AM):**

```sql
SELECT cron.schedule(
  'clear-expired-cache',
  '0 3 * * *', -- La 3 AM zilnic
  $$SELECT public.clear_expired_cache();$$
);
```

---

## 🆘 Ajutor Suplimentar

Dacă întâmpini probleme:

1. **Verifică logs-urile** în Supabase Dashboard → **Logs** → **Postgres Logs**
2. **Verifică erorile** în SQL Editor (apare mesajul de eroare)
3. **Contactează support** dacă problema persistă

---

## ✅ Gata!

După ce ai completat toți pașii, aplicația ta ar trebui să aibă:
- ✅ Backup & restore funcțional
- ✅ Securitate îmbunătățită
- ✅ Ingrediente optimizate
- ✅ Validare abonamente
- ✅ Error tracking centralizat
- ✅ Performanță îmbunătățită

**Succes! 🚀**

