import React from 'react';
import { Button } from '@/components/ui/button';
import { ListChecks, Share2, TrendingUp, ArrowRight, ShieldCheck, Lock } from 'lucide-react';

interface OnboardingScreenProps {
    onStart: () => void; // Function to proceed to the login form
}

export function OnboardingScreen({ onStart }: OnboardingScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 text-center">
            <div className="space-y-8 max-w-md w-full">
                <div className="flex flex-col items-center space-y-3">
                    <ListChecks className="w-20 h-20 text-emerald-400 drop-shadow-lg" />
                    <h1 className="4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-blue-400">
                        Welcome to ListNer
                    </h1>
                    <p className="text-md text-slate-300 max-w-xs leading-relaxed">
                        Your collaborative system for household management.
                    </p>
                </div>

                <div className="space-y-6 text-left w-full">
                    {[
                        {
                            icon: Share2,
                            title: "Shared Lists & Tasks",
                            description: "Stop texting. Start syncing. Keeps everyone on the same page for shopping and to-dos.",
                        },
                        {
                            icon: TrendingUp,
                            title: "Track Expenses & IOUs",
                            description: "Monitor household spending and manage shared debts instantly.",
                        },
                        {
                            icon: Lock,
                            title: "Data Secured", // 👈 NEW SECURITY FEATURE
                            description: "Your information is protected by RLS (Row Level Security) and database encryption.",
                        },
                    ].map((feature, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl shadow-inner border border-slate-700/50">
                            <feature.icon className="w-7 h-7 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold text-emerald-300">{feature.title}</h3>
                                <p className="text-sm text-slate-400">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    onClick={onStart}
                    className="w-full text-lg h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-8"
                >
                    Sign In or Get Started <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}