# Plan de Curățare Proiect Snacksy

Acest document identifică fișierele care pot fi eliminate sau organizate.

## 📁 Structură Recomandată

```
Snacksy-main/
├── src/                          # ✅ PĂSTREAZĂ - Cod sursă
├── supabase/
│   ├── migrations/              # ✅ PĂSTREAZĂ - Doar migrări oficiale
│   ├── functions/               # ✅ PĂSTREAZĂ - Edge Functions
│   └── config.toml              # ✅ PĂSTREAZĂ - Config
├── public/                       # ✅ PĂSTREAZĂ - Assets publice
├── docs/                         # 🆕 CREEAZĂ - Documentație organizată
│   ├── deployment/              # Ghiduri deployment
│   ├── setup/                   # Ghiduri setup
│   └── troubleshooting/         # Ghiduri troubleshooting
├── scripts/                      # 🆕 CREEAZĂ - Scripturi SQL utile
│   ├── verification/            # Scripturi de verificare
│   └── maintenance/             # Scripturi de mentenanță
└── README.md                     # ✅ PĂSTREAZĂ - Documentație principală
```

---

## 🗑️ FIȘIERE DE ȘTERS (Root Directory)

### SQL Files - Debug/Test (Pot fi șterse - sunt duplicate sau temporare)

- ❌ `DEBUG_ADMIN_STATUS.sql` - Debug temporar
- ❌ `DEBUG_SIGNUP_ISSUE.sql` - Debug temporar
- ❌ `DEBUG_SUBSCRIPTION_CHECKOUT.sql` - Debug temporar
- ❌ `FIX_ALL_ISSUES_NOW.sql` - Fix temporar, acum în migrări
- ❌ `FIX_ADMIN_ACCESS.sql` - Fix temporar
- ❌ `FIX_AMBIGUOUS_COLUMNS.sql` - Fix temporar
- ❌ `FIX_ENUM_TYPES.sql` - Fix temporar
- ❌ `FIX_GRANT_SUBSCRIPTION_ENUM.sql` - Fix temporar
- ❌ `FIX_NEW_USER_SIGNUP.sql` - Fix temporar
- ❌ `FIX_PROFILES_UNIQUE_CONSTRAINT.sql` - Fix temporar
- ❌ `FIX_RLS_POLICY_CLEAN.sql` - Fix temporar
- ❌ `FIX_RLS_POLICY.sql` - Fix temporar
- ❌ `FIX_SUBSCRIPTION_COMPLETE.sql` - Fix temporar
- ❌ `FIX_SUBSCRIPTION_MANUAL.sql` - Fix temporar
- ❌ `FIX_TYPE_MISMATCH.sql` - Fix temporar
- ❌ `FIX_UPSERT_CONSTRAINT.sql` - Fix temporar
- ❌ `FIX_USER_MISSING_PROFILE_SUBSCRIPTION.sql` - Fix temporar
- ❌ `FIX_WEBHOOK_RLS_POLICIES.sql` - Fix temporar
- ❌ `QUICK_ADMIN_GRANT.sql` - Script temporar
- ❌ `QUICK_SECURITY_AUDIT.sql` - Script temporar
- ❌ `TEST_ADMIN_STATUS.sql` - Test temporar
- ❌ `TEST_DATABASE_CONNECTION.sql` - Test temporar
- ❌ `UPDATE_TEST_ACCOUNT_SOURCE.sql` - Update temporar
- ❌ `VERIFICA_CONSTRAINT_USER_SUBSCRIPTIONS.sql` - Verificare temporară
- ❌ `VERIFICA_TRIGGER_NEW_USER.sql` - Verificare temporară
- ❌ `VERIFICA_UTILIZATORI_NOI.sql` - Verificare temporară
- ❌ `VERIFY_ADMIN_STATUS.sql` - Verificare temporară
- ❌ `CLEANUP_ADMIN_FUNCTIONS.sql` - Cleanup temporar
- ❌ `CREATE_ADMIN_FUNCTIONS.sql` - Creat în migrări
- ❌ `APPLY_FREE_TRIAL_MIGRATION.sql` - Aplicat deja

### SQL Files - Utile (Mută în scripts/)

- ⚠️ `ACTIVEAZA_CRON_JOBS.sql` → Mută în `scripts/maintenance/`
- ⚠️ `VERIFICA_DEPLOY.sql` → Mută în `scripts/verification/`
- ⚠️ `VERIFICA_MATERIALIZED_VIEW.sql` → Mută în `scripts/verification/`

### Markdown Files - Documentație Veche/Duplicate

- ❌ `ADD_INGREDIENT_DEPLOYMENT.md` - Veche, info în migrări
- ❌ `ADMIN_COMMANDS_SECURITY.md` - Duplicat cu ADMIN_SQL_COMMANDS.md
- ❌ `ADMIN_ROLE_COMMANDS.md` - Duplicat
- ❌ `ADMIN_SECURITY_SUMMARY.md` - Info în RLS_POLICIES_DOCUMENTATION.md
- ❌ `ALL_FIXES_SUMMARY.md` - Veche, înlocuită de FIXES_5_10_SUMMARY.md
- ❌ `APPLY_MIGRATION.md` - Veche, info în TUTORIAL_DEPLOY_MANUAL.md
- ❌ `CUM_ADAUGA_ENDPOINT_STRIPE.md` - Veche
- ❌ `CUM_TRIMITE_TEST_EVENT_STRIPE.md` - Veche
- ❌ `DEBUG_PLAN_UPDATE.md` - Debug temporar
- ❌ `DEBUG_STRIPE_CHECKOUT.md` - Debug temporar
- ❌ `DEBUG_WEBHOOK.md` - Debug temporar
- ❌ `DEPLOY_WEBHOOK_CLI.md` - Veche
- ❌ `DEPLOYMENT.md` - Veche, info în TUTORIAL_DEPLOY_MANUAL.md
- ❌ `ENV_SETUP.md` - Veche
- ❌ `ERROR_TRACKING_SUMMARY.md` - Info în FIXES_5_10_SUMMARY.md
- ❌ `FIX_401_WEBHOOK_SUPABASE.md` - Fix temporar
- ❌ `FIX_NO_LOGS_WEBHOOK.md` - Fix temporar
- ❌ `FIX_STRIPE_WEBHOOK_401.md` - Fix temporar
- ❌ `FIX_WEBHOOK_NO_RESULTS.md` - Fix temporar
- ❌ `FORCE_REFRESH_SUBSCRIPTION.md` - Fix temporar
- ❌ `FREE_TRIAL_DEPLOYMENT_GUIDE.md` - Info în STRIPE_SETUP.md
- ❌ `GUID_CREARE_PRODUSE_STRIPE.md` - Veche
- ❌ `GUID_WEBHOOK_STRIPE.md` - Veche
- ❌ `INSTALARE_STRIPE_CLI.md` - Veche
- ❌ `PAȘI_URMĂTORI.md` - Veche
- ❌ `RATE_LIMITING_SETUP.md` - Info în migrări
- ❌ `REDENUMEȘTE_FUNCȚIILE.md` - Veche
- ❌ `REDEPLOY_WEBHOOK.md` - Veche
- ❌ `SOLUTIE_WEBHOOK_SIMPLE.md` - Veche
- ❌ `STRIPE_FREE_TRIAL_SETUP.md` - Duplicat cu STRIPE_SETUP.md
- ❌ `TEST_WEBHOOK_MANUAL.md` - Test temporar
- ❌ `TEST_WEBHOOK_STRIPE_CLI.md` - Test temporar
- ❌ `test-add-ingredient.md` - Test temporar
- ❌ `TESTARE_SUBSCRIPTION.md` - Test temporar
- ❌ `VERIFICA_WEBHOOK_LOGURI.md` - Verificare temporară
- ❌ `VERIFICA_WEBHOOK_SERVICE_ROLE.md` - Verificare temporară
- ❌ `WEBHOOK_401_ERROR_EXPLAINED.md` - Fix temporar
- ❌ `WEEKLY_RESET_SETUP.md` - Info în migrări

### Markdown Files - Utile (Mută în docs/)

- ⚠️ `TUTORIAL_DEPLOY_MANUAL.md` → Mută în `docs/deployment/`
- ⚠️ `FIXES_5_10_SUMMARY.md` → Mută în `docs/deployment/`
- ⚠️ `GUID_CRON_JOBS.md` → Mută în `docs/setup/`
- ⚠️ `SETUP_EDGE_FUNCTION_CRON.md` → Mută în `docs/setup/`
- ⚠️ `STRIPE_SETUP.md` → Mută în `docs/setup/`
- ⚠️ `RLS_POLICIES_DOCUMENTATION.md` → Mută în `docs/`
- ⚠️ `DATABASE_SECURITY_CHECKLIST.md` → Mută în `docs/`
- ⚠️ `ADMIN_SQL_COMMANDS.md` → Mută în `docs/`

### Alte Fișiere

- ❌ `COD_CORECT_CREATE_CHECKOUT.txt` - Veche
- ❌ `deploy-weekly-reset.js` - Veche, nu mai e necesară

---

## 📂 MIGRĂRI - Verificare Duplicate

### Migrări Oficiale (PĂSTREAZĂ)

✅ Toate migrările din `supabase/migrations/` cu nume format `YYYYMMDDHHMMSS_description.sql` sunt oficiale și trebuie păstrate.

### Verifică Duplicate

Unele migrări pot avea duplicate sau versiuni vechi. Verifică:

- `20250824103649_*` și `20250824103721_*` - Verifică dacă sunt duplicate
- `20250120000002_add_free_trial_tracking.sql` și `20250120000002_error_logs_table.sql` - Același timestamp!

---

## 🗄️ SUPABASE - Curățare Database

### Funcții Neutilizate

Verifică și elimină funcții care nu mai sunt folosite:

```sql
-- Verifică funcții care nu sunt folosite
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Tabele Temporare/Test

Verifică dacă există tabele de test care pot fi eliminate.

### Indexuri Neutilizate

```sql
-- Verifică indexuri neutilizate
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

---

## ✅ Acțiuni Recomandate

### Pasul 1: Creează Structura

```bash
mkdir docs
mkdir docs/deployment
mkdir docs/setup
mkdir docs/troubleshooting
mkdir scripts
mkdir scripts/verification
mkdir scripts/maintenance
```

### Pasul 2: Mută Fișiere Utile

Mută fișierele utile în folderele noi.

### Pasul 3: Șterge Fișiere Temporare

Șterge toate fișierele marcate cu ❌.

### Pasul 4: Verifică Migrări

Verifică duplicate în migrări și elimină duplicatele.

### Pasul 5: Curăță Database

Rulează scripturile SQL pentru a identifica funcții/tabele neutilizate.

---

## 📊 Rezumat

- **Fișiere de șters:** ~50+ fișiere SQL și MD temporare
- **Fișiere de mutat:** ~10 fișiere utile în foldere organizate
- **Migrări de verificat:** 2-3 potențiale duplicate
- **Database:** Verifică funcții/tabele neutilizate

---

**După curățare, proiectul va fi mult mai organizat și ușor de navigat! 🚀**

