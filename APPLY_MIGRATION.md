# How to Apply the Individual Weekly Cycles Migration

## 🚀 Quick Method: Supabase Dashboard SQL Editor

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**
   - Open the file: `supabase/migrations/20250121000000_individual_weekly_cycles.sql`
   - Copy **all** the SQL content
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click the "Run" button (or press `Ctrl+Enter` / `Cmd+Enter`)
   - Wait for the execution to complete

5. **Verify Success**
   - Check the output panel for any errors
   - You should see success messages confirming:
     - Column added to `user_activity` table
     - Functions created/updated
     - Trigger created
     - Plan limits updated

## 🔧 Alternative Method: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Push all migrations (including the new one)
supabase db push

# Or apply a specific migration
supabase migration up
```

## ✅ Verification Steps

After applying the migration, verify it worked:

1. **Check the column exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'user_activity' 
   AND column_name = 'subscription_cycle_start_date';
   ```

2. **Check the function exists:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'check_and_reset_user_weekly_count';
   ```

3. **Test the function:**
   ```sql
   -- Replace 'YOUR_USER_ID' with an actual user ID
   SELECT check_and_reset_user_weekly_count('YOUR_USER_ID'::uuid);
   ```

4. **Check plan limits:**
   ```sql
   SELECT plan, meals_per_week 
   FROM plan_limits 
   WHERE plan = 'unlimited';
   -- Should show NULL for meals_per_week
   ```

## 🐛 Troubleshooting

### If you get errors:

1. **Column already exists**: This means the column was already added. The migration uses `ADD COLUMN IF NOT EXISTS` so it should be safe.

2. **Function already exists**: The migration uses `CREATE OR REPLACE FUNCTION` so it will update existing functions.

3. **Permission errors**: Make sure you're using a database user with proper permissions (usually the service role key or postgres user).

4. **Syntax errors**: Check that you copied the entire migration file without any truncation.

## 📝 What This Migration Does

- ✅ Adds `subscription_cycle_start_date` column to track individual 7-day cycles
- ✅ Initializes cycle start dates for existing users
- ✅ Updates reset functions to check 7-day cycles from subscription start
- ✅ Creates trigger to initialize cycle dates for new subscriptions
- ✅ Updates unlimited plan to have NULL for `meals_per_week`

## 🎯 After Migration

Once the migration is applied:
- Existing users will have their cycle start date set to their subscription creation date
- New users will automatically get a cycle start date when they sign up
- Weekly resets will now happen every 7 days from each user's subscription start date
- Unlimited plans will properly show "∞" in the UI

---

**Need Help?** Check the migration file comments or review the Supabase logs for detailed error messages.

