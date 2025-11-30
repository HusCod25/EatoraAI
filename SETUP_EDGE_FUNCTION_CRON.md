# Setup Cron Jobs cu Edge Functions (Opțiunea 2)

Dacă `pg_cron` nu este disponibil în Supabase, folosește această metodă cu Edge Functions și servicii externe.

## 📋 Pași de Setup

### Pasul 1: Creează Edge Function

Creează fișierul: `supabase/functions/refresh-cache/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verifică autentificare (folosește service role key)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any = {};

    // 1. Reîmprospătează materialized view
    try {
      const { error: refreshError } = await supabase.rpc('refresh_ingredients_search_cache');
      if (refreshError) throw refreshError;
      results.refresh_cache = 'success';
    } catch (error) {
      results.refresh_cache = `error: ${error.message}`;
    }
    
    // 2. Curățare cache expirat
    try {
      const { data: clearedCount, error: clearError } = await supabase.rpc('clear_expired_cache');
      if (clearError) throw clearError;
      results.clear_cache = `success: ${clearedCount} entries cleared`;
    } catch (error) {
      results.clear_cache = `error: ${error.message}`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### Pasul 2: Deploy Edge Function

În terminal, rulează:

```bash
# Navighează la folderul proiectului
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"

# Deploy function
supabase functions deploy refresh-cache
```

### Pasul 3: Obține Keys-urile necesare

1. Mergi la **Supabase Dashboard** → **Settings** → **API**
2. Copiază:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **service_role key** (secret key - nu anon key!)

### Pasul 4: Configurează Cron Service

#### Opțiunea A: cron-job.org (Recomandat - Gratuit)

1. Mergi la: https://cron-job.org
2. Creează cont gratuit
3. Click pe **"Create cronjob"**
4. Completează:
   - **Title:** `Refresh Snacksy Cache`
   - **Address (URL):** `https://YOUR_PROJECT.supabase.co/functions/v1/refresh-cache`
   - **Schedule:** 
     - **Minute:** `0`
     - **Hour:** `2` (sau `3` pentru curățare cache)
     - **Day of month:** `*` (toate)
     - **Month:** `*` (toate)
     - **Day of week:** `*` (toate)
   - **Request method:** `POST`
   - **Request headers:**
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     apikey: YOUR_ANON_KEY
     Content-Type: application/json
     ```
5. Click **"Create cronjob"**

#### Opțiunea B: GitHub Actions (Dacă ai repo pe GitHub)

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
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT.supabase.co/functions/v1/refresh-cache
```

Apoi adaugă secrets în GitHub:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Pasul 5: Testează Manual

Testează Edge Function-ul manual:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT.supabase.co/functions/v1/refresh-cache
```

Sau folosește Postman/Insomnia pentru test.

## ✅ Verificare

După configurare, verifică:

1. **Verifică că Edge Function-ul funcționează:**
   - Rulează testul manual de mai sus
   - Ar trebui să primești `{"success": true, ...}`

2. **Verifică că cron job-ul rulează:**
   - Mergi la cron-job.org → **Execution history**
   - Ar trebui să vezi execuții zilnice la 2 AM

3. **Verifică rezultatele:**
   ```sql
   -- Verifică că materialized view a fost reîmprospătat
   SELECT COUNT(*) FROM public.ingredients_search_cache;
   
   -- Verifică că cache-ul a fost curățat
   SELECT COUNT(*) FROM public.query_cache;
   ```

## 🎯 Rezumat

1. ✅ Creează Edge Function `refresh-cache`
2. ✅ Deploy function în Supabase
3. ✅ Configurează cron job pe cron-job.org
4. ✅ Testează manual
5. ✅ Monitorizează execuțiile

**Gata! Cache-ul se va reîmprospăta automat zilnic! 🚀**

