"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BouncePage() {
    const [status, setStatus] = useState("Finalizing login...");
    const router = useRouter();

    useEffect(() => {
        // 1. Safety Check: Ensure we are running in the browser
        if (typeof window === 'undefined') return;

        // 2. Grab the hash containing the tokens (e.g., #access_token=...&refresh_token=...)
        const hash = window.location.hash;

        // 3. Handle "Lost" Users (Web/PWA users who shouldn't be here)
        if (!hash) {
            setStatus("No session found. Redirecting to home...");
            // If no tokens, just send them to the standard web dashboard
            setTimeout(() => router.push('/'), 1500);
            return;
        }

        // 4. Construct the Native Deep Link
        // This converts the HTTPS URL into the Custom Scheme URL specifically for the Android App
        const deepLink = `listner://callback${hash}`;

        setStatus("Opening ListNer App...");

        // 5. Trigger the redirect to the Native App
        window.location.href = deepLink;

        // 6. Fallback (Safety Net)
        // If the browser stays on this page for more than 4 seconds, it means the 
        // "listner://" app didn't open (likely because the user is on Web/PWA).
        // We gracefully redirect them to the Web Dashboard.
        const timer = setTimeout(() => {
            setStatus("Redirecting to Web Dashboard...");
            router.push('/');
        }, 4000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
            <div className="animate-pulse mb-6">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/50">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-2 tracking-tight">Authenticating...</h1>
            <p className="text-slate-400 mb-10 max-w-md mx-auto leading-relaxed">{status}</p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                {/* Primary Manual Button (For Native App) */}
                <a
                    href={`listner://callback${typeof window !== 'undefined' ? window.location.hash : ''}`}
                    className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center"
                >
                    Open App
                </a>

                {/* Web Fallback Button (For Web/PWA Users) */}
                <button
                    onClick={() => router.push('/')}
                    className="w-full px-6 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-slate-300 transition-colors"
                >
                    Continue on Web
                </button>
            </div>
        </div>
    );
}