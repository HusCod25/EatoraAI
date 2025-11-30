# Weekly Reset System Setup

This document explains how to set up and use the weekly reset system for meal generation limits.

## Overview

The weekly reset system automatically resets the `weekly_meals_used` counter to 0 for all users every week, allowing them to use their full weekly meal generation quota again.

## Components

### 1. Database Functions

- **`reset_weekly_meal_counts()`**: Resets weekly meal counts for all users with old reset dates
- **`check_and_reset_user_weekly_count(user_uuid)`**: Checks and resets a specific user's weekly count if needed
- **`get_user_activity_with_reset(user_uuid)`**: Gets user activity data with automatic reset check

### 2. Edge Function

- **`weekly-reset`**: Scheduled function that runs the global reset automatically

### 3. Frontend Integration

- **`useUserActivity` hook**: Updated to automatically check for resets when fetching activity data

## Setup Instructions

### 1. Run the Migration

Apply the migration to create the database functions:

```bash
supabase db push
```

### 2. Deploy the Edge Function

Deploy the weekly reset Edge Function:

```bash
supabase functions deploy weekly-reset
```

### 3. Set Up Scheduled Execution

To run the weekly reset automatically, you need to set up a cron job or scheduled task. Here are a few options:

#### Option A: Using Supabase Cron (Recommended)

Add this to your Supabase project's cron jobs (if available):

```sql
-- Run every Monday at 00:00 UTC
SELECT cron.schedule('weekly-reset', '0 0 * * 1', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/weekly-reset'', headers:=''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb);');
```

#### Option B: External Cron Service

Use a service like cron-job.org or GitHub Actions to call the function weekly:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/weekly-reset' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

#### Option C: Manual Execution

You can manually trigger the reset by calling the Edge Function or running the SQL function directly.

### 4. Test the System

Run the test script in the Supabase SQL editor to verify everything works:

```sql
-- Test the reset functionality
SELECT public.check_and_reset_user_weekly_count('your-user-id'::uuid);
```

## How It Works

1. **Automatic Reset Check**: Every time a user's activity is fetched, the system checks if their `weekly_reset_date` is older than the current date
2. **Individual Reset**: If a reset is needed, the user's `weekly_meals_used` is set to 0 and `weekly_reset_date` is updated to the current date
3. **Global Reset**: The scheduled function runs weekly to reset all users at once
4. **Seamless Integration**: The frontend automatically handles resets without user intervention

## Database Schema

The system uses the existing `user_activity` table with these key fields:

- `weekly_meals_used`: Current count of meals generated this week
- `weekly_reset_date`: Date when the weekly count was last reset

## Monitoring

You can monitor the reset system by:

1. Checking the Edge Function logs in the Supabase dashboard
2. Querying the `user_activity` table to see reset dates
3. Using the test script to verify functionality

## Troubleshooting

### Common Issues

1. **Reset not working**: Check that the database functions are properly created and have the right permissions
2. **Scheduled function not running**: Verify the cron job or scheduled task is properly configured
3. **Frontend not updating**: Ensure the `useUserActivity` hook is using the new RPC function

### Manual Reset

If you need to manually reset all users:

```sql
SELECT public.reset_weekly_meal_counts();
```

### Check Reset Status

To see which users need resets:

```sql
SELECT user_id, weekly_meals_used, weekly_reset_date 
FROM public.user_activity 
WHERE weekly_reset_date < CURRENT_DATE;
```

## Security

- All database functions use `SECURITY DEFINER` to ensure proper permissions
- The Edge Function requires the service role key for authentication
- RLS policies are maintained for user data access

## Performance

- The reset functions are optimized to only update users who need resets
- Individual user checks are fast and don't impact performance
- Global resets are batched for efficiency
