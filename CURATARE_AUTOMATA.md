# Curățare Automată Proiect

Acest ghid te ajută să cureți proiectul pas cu pas.

## 🎯 Ce Am Identificat

### Fișiere de Șters: ~50+ fișiere
- SQL temporare de debug/test
- Documentație veche/duplicate
- Scripturi temporare

### Migrări Duplicate
- `20250824103649_*` și `20250824103721_*` - par identice
- Verifică manual înainte de ștergere!

---

## 📋 Pași de Curățare

### Pasul 1: Verifică Database (IMPORTANT!)

Înainte de a șterge ceva, verifică database-ul:

1. Deschide Supabase SQL Editor
2. Rulează `SCRIPT_CURATARE.sql`
3. Verifică rezultatele
4. **NU ȘTERGE** nimic din database încă - doar verifică!

---

### Pasul 2: Creează Structura de Foldere

Rulează în terminal (PowerShell):

```powershell
# Navighează la proiect
cd "C:\Users\mihai\Desktop\Snacksy-main\Snacksy-main"

# Creează foldere pentru organizare
New-Item -ItemType Directory -Force -Path "docs"
New-Item -ItemType Directory -Force -Path "docs\deployment"
New-Item -ItemType Directory -Force -Path "docs\setup"
New-Item -ItemType Directory -Force -Path "docs\troubleshooting"
New-Item -ItemType Directory -Force -Path "scripts"
New-Item -ItemType Directory -Force -Path "scripts\verification"
New-Item -ItemType Directory -Force -Path "scripts\maintenance"
```

---

### Pasul 3: Mută Fișiere Utile

Mută manual sau folosește PowerShell:

```powershell
# Mută documentație utilă
Move-Item "TUTORIAL_DEPLOY_MANUAL.md" -Destination "docs\deployment\"
Move-Item "FIXES_5_10_SUMMARY.md" -Destination "docs\deployment\"
Move-Item "GUID_CRON_JOBS.md" -Destination "docs\setup\"
Move-Item "SETUP_EDGE_FUNCTION_CRON.md" -Destination "docs\setup\"
Move-Item "STRIPE_SETUP.md" -Destination "docs\setup\"
Move-Item "RLS_POLICIES_DOCUMENTATION.md" -Destination "docs\"
Move-Item "DATABASE_SECURITY_CHECKLIST.md" -Destination "docs\"
Move-Item "ADMIN_SQL_COMMANDS.md" -Destination "docs\"

# Mută scripturi utile
Move-Item "ACTIVEAZA_CRON_JOBS.sql" -Destination "scripts\maintenance\"
Move-Item "VERIFICA_DEPLOY.sql" -Destination "scripts\verification\"
Move-Item "VERIFICA_MATERIALIZED_VIEW.sql" -Destination "scripts\verification\"
Move-Item "SCRIPT_CURATARE.sql" -Destination "scripts\verification\"
```

---

### Pasul 4: Șterge Fișiere Temporare

⚠️ **ATENȚIE:** Verifică înainte de ștergere că nu ai nevoie de ele!

#### SQL Files de Șters:

```powershell
# Șterge SQL temporare
Remove-Item "DEBUG_*.sql"
Remove-Item "FIX_*.sql" -Exclude "FIXES_5_10_SUMMARY.md"
Remove-Item "QUICK_*.sql"
Remove-Item "TEST_*.sql"
Remove-Item "VERIFICA_*.sql" -Exclude "VERIFICA_DEPLOY.sql","VERIFICA_MATERIALIZED_VIEW.sql"
Remove-Item "VERIFY_*.sql"
Remove-Item "UPDATE_*.sql"
Remove-Item "CLEANUP_*.sql"
Remove-Item "CREATE_*.sql"
Remove-Item "APPLY_*.sql"
Remove-Item "FIX_USER_MISSING_PROFILE_SUBSCRIPTION.sql"
```

#### Markdown Files de Șters:

```powershell
# Șterge MD temporare/vechi
Remove-Item "ADD_INGREDIENT_DEPLOYMENT.md"
Remove-Item "ADMIN_COMMANDS_SECURITY.md"
Remove-Item "ADMIN_ROLE_COMMANDS.md"
Remove-Item "ADMIN_SECURITY_SUMMARY.md"
Remove-Item "ALL_FIXES_SUMMARY.md"
Remove-Item "APPLY_MIGRATION.md"
Remove-Item "CUM_*.md"
Remove-Item "DEBUG_*.md"
Remove-Item "DEPLOY_*.md"
Remove-Item "DEPLOYMENT.md"
Remove-Item "ENV_SETUP.md"
Remove-Item "ERROR_TRACKING_SUMMARY.md"
Remove-Item "FIX_*.md" -Exclude "FIXES_5_10_SUMMARY.md"
Remove-Item "FORCE_*.md"
Remove-Item "FREE_TRIAL_*.md"
Remove-Item "GUID_CREARE_*.md"
Remove-Item "GUID_WEBHOOK_*.md"
Remove-Item "INSTALARE_*.md"
Remove-Item "PAȘI_URMĂTORI.md"
Remove-Item "RATE_LIMITING_*.md"
Remove-Item "REDENUMEȘTE_*.md"
Remove-Item "REDEPLOY_*.md"
Remove-Item "SOLUTIE_*.md"
Remove-Item "TEST_*.md"
Remove-Item "test-*.md"
Remove-Item "VERIFICA_*.md" -Exclude "VERIFICA_DEPLOY.sql"
Remove-Item "WEBHOOK_*.md"
Remove-Item "WEEKLY_RESET_*.md"
```

#### Alte Fișiere:

```powershell
Remove-Item "COD_CORECT_CREATE_CHECKOUT.txt"
Remove-Item "deploy-weekly-reset.js"
```

---

### Pasul 5: Verifică Migrări Duplicate

⚠️ **IMPORTANT:** Verifică manual înainte de ștergere!

1. Deschide ambele fișiere:
   - `supabase/migrations/20250824103649_*.sql`
   - `supabase/migrations/20250824103721_*.sql`

2. Compară conținutul - dacă sunt identice, șterge unul

3. Verifică în Supabase dacă ambele au fost aplicate:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE version LIKE '20250824103649%' OR version LIKE '20250824103721%'
   ORDER BY version;
   ```

---

### Pasul 6: Actualizează README.md

Actualizează `README.md` cu structura nouă:

```markdown
# Snacksy

## Documentație

- [Deployment Guide](docs/deployment/TUTORIAL_DEPLOY_MANUAL.md)
- [Cron Jobs Setup](docs/setup/GUID_CRON_JOBS.md)
- [Stripe Setup](docs/setup/STRIPE_SETUP.md)
- [RLS Policies](docs/RLS_POLICIES_DOCUMENTATION.md)

## Scripts

- [Verificare Deploy](scripts/verification/VERIFICA_DEPLOY.sql)
- [Activare Cron Jobs](scripts/maintenance/ACTIVEAZA_CRON_JOBS.sql)
```

---

## ✅ Checklist Final

După curățare, verifică:

- [ ] Toate fișierele temporare au fost șterse
- [ ] Fișierele utile au fost mutate în foldere organizate
- [ ] Migrările duplicate au fost verificate
- [ ] README.md a fost actualizat
- [ ] Database-ul a fost verificat (nu șters nimic)
- [ ] Proiectul se compilează corect
- [ ] Aplicația funcționează corect

---

## 🆘 Dacă Ceva Nu Funcționează

Dacă după curățare ceva nu funcționează:

1. Verifică dacă ai șters ceva important
2. Restaurează din backup (dacă ai)
3. Verifică log-urile pentru erori
4. Rulează `VERIFICA_DEPLOY.sql` pentru a verifica database-ul

---

**Succes cu curățarea! 🚀**

