// lib/supabase.ts content:
import { createClient } from '@supabase/supabase-js'

// 🔐 CREDENTIALS
const supabaseUrl = 'https://fcwgqjsdijogtjpodvlv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd2dxanNkaWpvZ3RqcG9kdmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODc4NDMsImV4cCI6MjA3ODk2Mzg0M30.C0jJtUdTOU6bTX3kCqnFPag9woff5MdBG9MH0Qw8ZGw'

export const saveDeviceTokenToDB = async (userId: string, token: string, platform: string) => {
    const { error } = await supabase
        .from('device_tokens')
        .upsert(
            { user_id: userId, token: token, platform: platform },
            { onConflict: 'token' }
        );
    if (error) console.error("❌ Error saving device token:", error);
    else console.log("✅ Device token saved to DB!");
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // 💾 CRITICAL: Save session to disk so it survives app restarts/OS killing
        persistSession: true,
        autoRefreshToken: true,
        // 💡 FIX: This MUST be true for PWA/Web OAuth to work correctly.
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
})