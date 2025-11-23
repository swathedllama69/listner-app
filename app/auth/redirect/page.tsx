"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BouncePage() {
    const [status, setStatus] = useState("Analyzing login data...");
    const [debugInfo, setDebugInfo] = useState("Waiting...");
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 💡 FIX: Capture both Hash (Implicit) and Search (PKCE Code)
        const hash = window.location.hash;
        const search = window.location.search; // Contains ?code=...

        if (!hash && !search) {
            setStatus("Login failed. No session data found.");
            setDebugInfo("❌ URL is empty (No code or tokens)");
            return;
        }

        setDebugInfo(search ? `✅ Code found: ${search.substring(0, 10)}...` : "✅ Hash found");

        // 💡 FIX: Construct deep link with EVERYTHING
        // This turns https://.../redirect?code=123 into listner://callback?code=123
        const deepLink = `listner://callback${search}${hash}`;

        setStatus("🚀 Launching App...");

        // Attempt Auto-Redirect
        window.location.href = deepLink;

        // Fallback timer
        const timer = setTimeout(() => {
            setStatus("Tap the button below to open the app.");
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Completing Login...</h1>
            <p className="text-slate-400 mb-8">{status}</p>
            <div className="mb-8 p-2 bg-slate-900 rounded text-xs text-slate-500 font-mono border border-slate-800">
                Debug: {debugInfo}
            </div>

            {/* 💡 FIX: Ensure button uses the calculated deep link dynamically */}
            <ButtonLink />
        </div>
    );
}

// Helper to safely grab window location for the button
function ButtonLink() {
    const [href, setHref] = useState("#");
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHref(`listner://callback${window.location.search}${window.location.hash}`);
        }
    }, []);

    return (
        <a href={href} className="w-full max-w-xs px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center">
            Open ListNer App
        </a>
    );
}