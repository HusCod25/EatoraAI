# Environment Variables Setup

This guide explains how to set up environment variables for the Snacksy application.

## Required Environment Variables

Create a `.env` file in the root directory of the project with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://axumwatbsahalscdrryv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4dW13YXRic2FoYWxzY2Rycnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA1MjUsImV4cCI6MjA3MTU1NjUyNX0.0BizbWyDzYeB2gbq5GZW5kcyX3ev4DdXEcnXUXDEM6M

# Error Tracking (Optional)
# Set to 'true' to enable error tracking in development
# In production, error tracking is automatically enabled
VITE_ENABLE_ERROR_TRACKING=false

# Disable Supabase error logging (set to 'false' to disable)
# Default: true (errors are logged to Supabase error_logs table)
VITE_ENABLE_SUPABASE_ERROR_LOGGING=true

# Sentry DSN (Optional - for future Sentry integration)
# VITE_SENTRY_DSN=your-sentry-dsn-here
```

## How to Get These Values

1. **VITE_SUPABASE_URL**: 
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the "Project URL"

2. **VITE_SUPABASE_ANON_KEY**:
   - In the same Settings → API page
   - Copy the "anon public" key (this is safe to expose in client-side code)

## Important Notes

⚠️ **Never commit the `.env` file to version control!**

- The `.env` file is already added to `.gitignore`
- The `.env.example` file is provided as a template (without actual values)
- For production deployments, set these environment variables in your hosting platform (Vercel, Netlify, etc.)

## Development vs Production

- **Development**: The code includes fallback values so the app will work even without a `.env` file during development
- **Production**: You MUST set these environment variables. The app will show an error if they're missing in production mode

## Troubleshooting

If you see an error about missing environment variables:
1. Make sure the `.env` file exists in the root directory
2. Check that the variable names start with `VITE_` (required for Vite to expose them to client code)
3. Restart your development server after creating/modifying the `.env` file

