"use client";

import { useEffect } from "react";
import { supabase } from '@/lib/supabase';

// This page is a simple handshake. It allows the Supabase client to read the session 
// and then immediately sends the user back to the app root.
export default function AuthRedirectPage() {
    useEffect(() => {
        const handleRedirect = async () => {
            // 1. Force the Supabase client to check the current URL for session tokens/code.
            // This is crucial for PWA/Web. Supabase handles the session exchange/saving internally.
            await supabase.auth.getSession();

            // 2. Redirect back to the app root. 
            // The app root (app/page.tsx) will then detect the session saved in localStorage.
            // We use replace to prevent the redirect page from sitting in history.
            window.location.replace(window.location.origin);
        };

        handleRedirect();

    }, []);

    // Display minimal UI while the redirect happens
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            fontFamily: 'sans-serif'
        }}>
            <h1 style={{ fontSize: '1.5em' }}>Completing Login...</h1>
            <p style={{ fontSize: '0.8em', color: '#666' }}>Returning to ListNer app. If you are not redirected, please refresh the page.</p>
        </div>
    );
}