"use client";

import { useEffect } from "react";

// This component runs *only* once in the browser to grab the tokens and redirect.
// It uses minimal code to avoid CSP conflicts that crash the PWA login.
export default function AuthRedirectPage() {
    useEffect(() => {
        // 1. Get the current URL parameters and hash.
        const hash = window.location.hash;
        const search = window.location.search;

        // 2. Check for tokens. Supabase sends either a 'code' (PKCE) or tokens in the hash.
        const hasTokens = hash.includes('access_token') || search.includes('code');

        if (hasTokens) {
            // 3. Construct the deep link URL. This bounces the user back to the native app.
            const deepLink = `listner://callback${search}${hash}`;

            console.log("Redirecting to:", deepLink);

            // 4. Execute the redirect
            window.location.href = deepLink;
        } else {
            // 5. If no tokens, something went wrong, send them back to the web login page
            // to allow standard Supabase error handling to take over.
            console.error("No tokens found on redirect. Returning to origin.");
            window.location.href = window.location.origin;
        }
    }, []);

    // Display minimal text while the redirect happens
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
            <p style={{ fontSize: '0.8em', color: '#666' }}>If you are not redirected, please open the ListNer app manually.</p>
        </div>
    );
}