console.log("🧠 CHECK ENV:");
console.log("VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY =", import.meta.env.VITE_SUPABASE_ANON_KEY);


import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY


if (import.meta.env.PROD && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error("❌ Supabase URL sau ANON KEY lipsesc. Verifică .env!")
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
)

export const getSupabaseUrl = () => SUPABASE_URL
