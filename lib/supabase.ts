import { createClient } from '@supabase/supabase-js'

// Read the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create and export the Supabase client with Persistence enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // Save session to disk
        autoRefreshToken: true,
        detectSessionInUrl: false, // We handle this manually in page.tsx
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
})