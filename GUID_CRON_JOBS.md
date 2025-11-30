# Ghid Complet: Cron Jobs și Automatizări

Acest ghid explică cum să configurezi automatizări (cron jobs) pentru aplicația Snacksy.

## 📚 Ce sunt Cron Jobs?

**Cron jobs** sunt task-uri programate care rulează automat la intervale de timp specificate. Sunt folosite pentru:
- Reîmprospătare materialized views
- Curățare cache expirat
- Backup-uri automate
- Reset-uri săptămânale
- Alte task-uri periodice

## 🕐 Format Cron

Cron folosește un format special pentru a specifica când să ruleze:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

### Exemple:

| Cron Expression | Descriere |
|----------------|-----------|
| `0 2 * * *` | La 2:00 AM în fiecare zi |
| `0 */6 * * *` | La fiecare 6 ore |
| `0 0 * * 1` | La 00:00 în fiecare luni (săptămânal) |
| `*/15 * * * *` | La fiecare 15 minute |
| `0 0 1 * *` | La 00:00 în prima zi a fiecărei luni |

## 🎯 Cron Jobs pentru Snacksy

### 1. Reîmprospătare Materialized View (Zilnic)

**Ce face:** Reîmprospătează cache-ul de search pentru ingrediente

**Când:** Zilnic la 2:00 AM

**De ce:** Pentru ca search-ul să fie rapid și să conțină cele mai recente ingrediente

---

### 2. Curățare Cache Expirat (Zilnic)

**Ce face:** Șterge intrările expirate din `query_cache`

**Când:** Zilnic la 3:00 AM

**De ce:** Pentru a nu umple baza de date cu cache vechi

---

### 3. Backup Automat (Săptămânal - Opțional)

**Ce face:** Creează backup pentru toate tabelele critice

**Când:** Săptămânal, luni la 00:00

**De ce:** Pentru siguranța datelor

---

### 4. Reset Săptămânal Mese (Automat)

**Ce face:** Resetează `weekly_meals_used` pentru utilizatori

**Când:** Zilnic (verifică automat dacă e nevoie de reset)

**De ce:** Pentru ca utilizatorii să-și poată regenera mesele săptămânal

---

## 🛠️ Opțiuni de Implementare

### Opțiunea 1: Supabase Cron (Recomandat - dacă e disponibil)

Supabase oferă extensia `pg_cron` pentru cron jobs native în PostgreSQL.

#### Verifică dacă e disponibil:

```sql
-- Verifică dacă extensia pg_cron există
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

#### Activează pg_cron (dacă nu e activat):

```sql
-- Activează extensia pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

#### Configurează Cron Jobs:

```sql
-- 1. Reîmprospătare Materialized View (zilnic la 2 AM)
SELECT cron.schedule(
  'refresh-ingredients-cache',           -- Nume job
  '0 2 * * *',                          -- Cron expression (2 AM zilnic)
  $$SELECT public.refresh_ingredients_search_cache();$$
);

-- 2. Curățare Cache Expirat (zilnic la 3 AM)
SELECT cron.schedule(
  'clear-expired-cache',                 -- Nume job
  '0 3 * * *',                          -- Cron expression (3 AM zilnic)
  $$SELECT public.clear_expired_cache();$$
);

-- 3. Backup Automat (săptămânal, luni la 00:00)
-- NOTĂ: Acest job necesită plan admin, deci ar trebui să fie rulat manual
-- sau prin Edge Function cu service role key
SELECT cron.schedule(
  'weekly-backup',                       -- Nume job
  '0 0 * * 1',                          -- Cron expression (luni la 00:00)
  $$SELECT public.backup_all_critical_tables();$$
);
```

#### Verifică Cron Jobs Configurate:

```sql
-- Vezi toate job-urile programate
SELECT * FROM cron.job;
```

#### Șterge un Cron Job:

```sql
-- Șterge un job specific
SELECT cron.unschedule('refresh-ingredients-cache');
```

---

### Opțiunea 2: Edge Functions + External Cron Service

Dacă `pg_cron` nu e disponibil în Supabase, poți folosi un serviciu extern care apelează Edge Functions.

#### Pasul 1: Creează Edge Function pentru Refresh

Creează fișierul: `supabase/functions/refresh-cache/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Reîmprospătează materialized view
    const { error: refreshError } = await supabase.rpc('refresh_ingredients_search_cache');
    
    if (refreshError) {
      throw refreshError;
    }

    // Curățare cache expirat
    const { error: clearError } = await supabase.rpc('clear_expired_cache');
    
    if (clearError) {
      throw clearError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache refreshed and expired entries cleared' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

#### Pasul 2: Deploy Edge Function

```bash
supabase functions deploy refresh-cache
```

#### Pasul 3: Configurează Cron Service Extern

Folosește unul dintre aceste servicii:

**A. cron-job.org (Gratuit)**

1. Mergi la: https://cron-job.org
2. Creează cont gratuit
3. Adaugă un nou cron job:
   - **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/refresh-cache`
   - **Method:** POST
   - **Headers:** 
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `apikey: YOUR_ANON_KEY`
   - **Schedule:** `0 2 * * *` (zilnic la 2 AM)

**B. GitHub Actions (Gratuit pentru repo-uri publice)**

Creează fișierul: `.github/workflows/refresh-cache.yml`

```yaml
name: Refresh Cache

on:
  schedule:
    # Rulează zilnic la 2:00 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Permite rulare manuală

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Ingredients Cache
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://YOUR_PROJECT.supabase.co/functions/v1/refresh-cache
```

**C. Vercel Cron (dacă folosești Vercel)**

Creează fișierul: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/refresh-cache",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

### Opțiunea 3: Supabase Edge Functions Scheduled (Beta)

Supabase oferă și scheduled functions (în beta):

```typescript
// supabase/functions/refresh-cache/index.ts
Deno.serve(async (req) => {
  // Codul tău
});

// Programare directă în Supabase Dashboard
// Dashboard → Edge Functions → Schedule
```

---

## 📋 Configurare Recomandată pentru Snacksy

### Setup Minimal (Recomandat pentru început):

1. **Reîmprospătare Materialized View** - Zilnic la 2 AM
2. **Curățare Cache** - Zilnic la 3 AM

### Setup Complet (Pentru producție):

1. **Reîmprospătare Materialized View** - Zilnic la 2 AM
2. **Curățare Cache** - Zilnic la 3 AM
3. **Backup Automat** - Săptămânal, luni la 00:00
4. **Logs Rotatie** - Lunar (opțional)

---

## 🔧 Script SQL pentru Setup Rapid

Salvează acest script ca `SETUP_CRON_JOBS.sql`:

```sql
-- Setup Cron Jobs pentru Snacksy
-- NOTĂ: Verifică mai întâi dacă pg_cron e disponibil

-- Verifică dacă pg_cron există
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠️ pg_cron nu este disponibil. Folosește Opțiunea 2 (Edge Functions + External Cron)';
    RETURN;
  END IF;

  -- Activează pg_cron
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Șterge job-urile existente (dacă există)
  PERFORM cron.unschedule('refresh-ingredients-cache');
  PERFORM cron.unschedule('clear-expired-cache');

  -- 1. Reîmprospătare Materialized View (zilnic la 2 AM)
  PERFORM cron.schedule(
    'refresh-ingredients-cache',
    '0 2 * * *',
    $$SELECT public.refresh_ingredients_search_cache();$$
  );

  -- 2. Curățare Cache Expirat (zilnic la 3 AM)
  PERFORM cron.schedule(
    'clear-expired-cache',
    '0 3 * * *',
    $$SELECT public.clear_expired_cache();$$
  );

  RAISE NOTICE '✅ Cron jobs configurate cu succes!';
END $$;

-- Verifică job-urile configurate
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname IN ('refresh-ingredients-cache', 'clear-expired-cache');
```

---

## 🧪 Testare Manuală

Înainte să configurezi cron jobs, testează manual funcțiile:

```sql
-- Test 1: Reîmprospătare Materialized View
SELECT public.refresh_ingredients_search_cache();

-- Test 2: Curățare Cache
SELECT public.clear_expired_cache();

-- Verifică rezultatele
SELECT COUNT(*) FROM public.ingredients_search_cache;
SELECT COUNT(*) FROM public.query_cache;
```

---

## 📊 Monitorizare Cron Jobs

### Verifică Log-urile:

```sql
-- Vezi istoricul execuțiilor (dacă e disponibil)
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Verifică Status Job-uri:

```sql
-- Vezi toate job-urile și statusul lor
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename
FROM cron.job;
```

---

## ⚠️ Notă Importantă

**Backup Automat** necesită plan admin, deci nu poate fi rulat direct prin cron job cu user normal. Soluții:

1. **Folosește Edge Function** cu service role key
2. **Rulează manual** săptămânal
3. **Creează un user special** cu permisiuni limitate doar pentru backup

---

## 🎯 Rezumat

1. **Cron jobs** = task-uri automate care rulează la intervale programate
2. **Opțiunea 1:** pg_cron (dacă e disponibil în Supabase) - cel mai simplu
3. **Opțiunea 2:** Edge Functions + servicii externe (cron-job.org, GitHub Actions) - cel mai flexibil
4. **Recomandat:** Reîmprospătare zilnică materialized view + curățare cache

---

## 🆘 Troubleshooting

### Problema: "pg_cron extension does not exist"

**Soluție:** Folosește Opțiunea 2 (Edge Functions + External Cron)

### Problema: "Permission denied"

**Soluție:** Verifică dacă ai permisiuni pentru a crea cron jobs sau folosește service role key

### Problema: "Job nu rulează"

**Soluție:** 
- Verifică timezone-ul (cron folosește UTC)
- Verifică log-urile pentru erori
- Testează manual funcțiile

---

**Succes cu automatizările! 🚀**

