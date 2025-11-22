"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
            <div className="bg-rose-50 p-4 rounded-full mb-6">
                <WifiOff className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                We couldn't load the application. This might be a network issue.
            </p>
            <Button
                onClick={() => reset()}
                className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 rounded-xl flex items-center gap-2"
            >
                <RefreshCcw className="w-4 h-4" /> Try Again
            </Button>
        </div>
    );
}