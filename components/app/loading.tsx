import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="relative">
                {/* Pulse Effect */}
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-white p-4 rounded-2xl shadow-sm">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
            </div>
            <p className="mt-6 text-sm font-medium text-slate-400 animate-pulse">Loading ListNer...</p>
        </div>
    );
}