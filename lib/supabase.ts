import { createClient } from "@supabase/supabase-js"

// Read the environment variables from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)