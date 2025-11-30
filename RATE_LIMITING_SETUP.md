# 🚀 Rate Limiting Setup - Ghid Pas cu Pas

## 📋 Ce face această funcționalitate?

- **Cooldown de 30 secunde** între fiecare request de generare meal
- **Limită de 10 request-uri pe minut** per utilizator
- **Mesaj clar** cu secunde rămase când utilizatorul încearcă prea repede

---

## ✅ Pasul 1: Aplică Migrația în Supabase

### Opțiunea A: Folosind Supabase CLI (Recomandat)

1. **Deschide terminalul** în folderul proiectului
2. **Verifică că ești conectat la Supabase:**
   ```bash
   supabase status
   ```

3. **Aplică migrația:**
   ```bash
   supabase db push
   ```

   Sau dacă vrei să aplici doar migrația specifică:
   ```bash
   supabase migration up
   ```

### Opțiunea B: Folosind Supabase Dashboard (Manual)

1. **Deschide Supabase Dashboard:**
   - Mergi la: https://supabase.com/dashboard
   - Selectează proiectul tău

2. **Navighează la SQL Editor:**
   - Click pe **"SQL Editor"** în meniul din stânga
   - Click pe **"New query"**

3. **Copiază și rulează migrația:**
   - Deschide fișierul: `supabase/migrations/20250122000000_user_activity_log_rate_limiting.sql`
   - Copiază **tot conținutul** fișierului
   - Lipește în SQL Editor
   - Click pe **"Run"** sau apasă `Ctrl+Enter`

4. **Verifică că a funcționat:**
   - Ar trebui să vezi mesajul: "Success. No rows returned"
   - Dacă vezi erori, verifică că nu există deja tabelul (poate fi creat parțial)

---

## ✅ Pasul 2: Verifică că Tabelul a Fost Creat

1. **În Supabase Dashboard:**
   - Mergi la **"Table Editor"**
   - Caută tabelul **`user_activity_log`**
   - Ar trebui să vezi coloanele: `id`, `user_id`, `action`, `created_at`

2. **Sau verifică în SQL Editor:**
   ```sql
   SELECT * FROM public.user_activity_log LIMIT 1;
   ```
   - Ar trebui să returneze fără erori (chiar dacă nu sunt date)

---

## ✅ Pasul 3: Verifică Trigger-ul

1. **În SQL Editor, rulează:**
   ```sql
   SELECT 
     trigger_name, 
     event_manipulation, 
     event_object_table,
     action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'user_activity_log';
   ```

2. **Ar trebui să vezi trigger-ul:**
   - `check_rate_limit_trigger`
   - Pe tabelul `user_activity_log`
   - Execută funcția `check_rate_limit_before_insert()`

---

## ✅ Pasul 4: Testează Funcționalitatea

### Test 1: Cooldown de 30 secunde

1. **Pornește aplicația:**
   ```bash
   npm run dev
   # sau
   yarn dev
   ```

2. **Loghează-te** în aplicație

3. **Generează un meal:**
   - Adaugă ingrediente
   - Click pe "Generate Meal"
   - Ar trebui să funcționeze normal

4. **Încearcă să generezi din nou IMEDIAT:**
   - Click pe "Generate Meal" din nou (în mai puțin de 30 secunde)
   - **Ar trebui să vezi:** "⚠️ Please wait X seconds before making another request."
   - Unde X = numărul de secunde rămase (ex: 28, 25, etc.)

5. **Așteaptă 30 de secunde:**
   - Încearcă din nou să generezi
   - **Ar trebui să funcționeze** normal

### Test 2: Limită de 10 request-uri pe minut

1. **Generează 10 meals rapid** (cu pauză de 30 secunde între ele)
2. **Încearcă să generezi al 11-lea** în același minut
3. **Ar trebui să vezi:** "⚠️ Too many requests. Please wait a few seconds!"

---

## 🔧 Troubleshooting

### Problema: "Table already exists"

**Soluție:**
```sql
-- Verifică dacă tabelul există
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_activity_log';

-- Dacă există, șterge-l și rulează migrația din nou
DROP TABLE IF EXISTS public.user_activity_log CASCADE;
-- Apoi rulează din nou migrația
```

### Problema: "Trigger already exists"

**Soluție:**
Migrația are deja `DROP TRIGGER IF EXISTS`, deci ar trebui să fie ok. Dacă tot vezi eroare:
```sql
DROP TRIGGER IF EXISTS check_rate_limit_trigger ON public.user_activity_log;
-- Apoi rulează din nou migrația
```

### Problema: Mesajul nu apare, dar request-ul e blocat

**Verifică:**
1. Deschide **Console** în browser (F12)
2. Caută erori în consolă
3. Verifică că mesajul de eroare din trigger conține "Rate limit" sau "Too many requests"

### Problema: Rate limiting nu funcționează deloc

**Verifică:**
1. Verifică că trigger-ul există (Pasul 3)
2. Verifică că funcția există:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'check_rate_limit_before_insert';
   ```
3. Testează manual trigger-ul:
   ```sql
   -- Înlocuiește USER_ID cu ID-ul tău real
   INSERT INTO public.user_activity_log (user_id, action)
   VALUES ('YOUR_USER_ID', 'generate_meal');
   -- Rulează de 2 ori rapid - a doua oară ar trebui să dea eroare
   ```

---

## 📝 Configurare Avansată

### Schimbă Cooldown-ul (30 secunde → alt număr)

Editează în migrație:
```sql
v_cooldown_seconds INTEGER := 30; -- Schimbă la câte secunde vrei
```

Apoi rulează din nou migrația sau doar funcția:
```sql
CREATE OR REPLACE FUNCTION public.check_rate_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  -- ... alte variabile ...
  v_cooldown_seconds INTEGER := 60; -- Ex: 60 secunde
BEGIN
  -- ... restul codului ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Schimbă Limita de Request-uri pe Minut

Editează în migrație:
```sql
v_max_requests INTEGER := 10; -- Schimbă la câte request-uri vrei
```

---

## ✅ Verificare Finală

După ce ai aplicat migrația, verifică:

- [ ] Tabelul `user_activity_log` există
- [ ] Trigger-ul `check_rate_limit_trigger` există
- [ ] Funcția `check_rate_limit_before_insert()` există
- [ ] Poți genera un meal normal
- [ ] Al doilea request în < 30 secunde este blocat cu mesaj
- [ ] După 30 secunde, poți genera din nou

---

## 🎉 Gata!

Dacă toate testele trec, rate limiting-ul funcționează corect! 

Utilizatorii vor trebui să aștepte 30 de secunde între request-uri, iar dacă fac prea multe request-uri într-un minut, vor fi blocați.

