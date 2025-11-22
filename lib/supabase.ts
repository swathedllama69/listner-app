import { createClient } from '@supabase/supabase-js'

// 🔐 Hardcoded credentials for Native App stability
const supabaseUrl = 'https://fcwgqjsdijogtjpodvlv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd2dxanNkaWpvZ3RqcG9kdmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODc4NDMsImV4cCI6MjA3ODk2Mzg0M30.C0jJtUdTOU6bTX3kCqnFPag9woff5MdBG9MH0Qw8ZGw'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // 💾 Persist session to storage so it survives app restarts
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // We handle the URL manually in page.tsx
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
})