"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BouncePage() {
    const [status, setStatus] = useState("Analyzing login data...");
    const [debugInfo, setDebugInfo] = useState("Waiting for tokens...");
    const router = useRouter();

    useEffect(() => {
        // Safety check
        if (typeof window === 'undefined') return;

        // 1. Get the hash (tokens)
        const hash = window.location.hash;
        setDebugInfo(hash ? "✅ Tokens Received" : "❌ No Tokens Found");

        if (!hash) {
            setStatus("Login failed. No session data found.");
            // Optional: Send back to home if truly failed
            // setTimeout(() => router.push('/'), 3000); 
            return;
        }

        // 2. Construct the Deep Link
        const deepLink = `listner://callback${hash}`;
        setStatus("🚀 Launching App...");

        // 3. Attempt Auto-Redirect
        window.location.href = deepLink;

        // 4. Fallback Timer
        // We do NOT redirect to home here, so you can test the button manually.
        const timer = setTimeout(() => {
            setStatus("⚠️ Auto-launch blocked by browser? Tap the button below.");
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Completing Login...</h1>

            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                {status}
            </p>

            {/* Debug Info */}
            <div className="mb-8 p-2 bg-slate-900 rounded text-xs text-slate-500 font-mono">
                Debug: {debugInfo}
            </div>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                {/* MANUAL LAUNCH BUTTON */}
                <a
                    href={`listner://callback${typeof window !== 'undefined' ? window.location.hash : ''}`}
                    className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center transition-all"
                >
                    Open ListNer App
                </a>

                <button
                    onClick={() => router.push('/')}
                    className="text-sm text-slate-500 hover:text-slate-300 mt-4 underline"
                >
                    Stuck? Continue on Web
                </button>
            </div>
        </div>
    );
}