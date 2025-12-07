//
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Wallet, ArrowRight, Layout } from 'lucide-react';

interface OnboardingScreenProps {
    onStart: () => void;
}

export function OnboardingScreen({ onStart }: OnboardingScreenProps) {
    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md flex flex-col h-full justify-between py-8">
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
                        <img src="/logo-icon-lg.png" alt="Logo" className="w-24 h-24 relative z-10 drop-shadow-2xl animate-in zoom-in duration-700" />
                    </div>

                    <div className="space-y-2 text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white">
                            List<span className="text-emerald-400">Ner</span>.
                        </h1>
                        <p className="text-lg text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                            Organize your life. Sync your home.
                        </p>
                    </div>

                    <div className="grid gap-3 w-full mt-8">
                        {[
                            {
                                icon: Layout,
                                color: "text-blue-400",
                                title: "Smart Lists",
                                desc: "Create shopping lists and to-dos just for you, or share them instantly."
                            },
                            {
                                icon: Wallet,
                                color: "text-emerald-400",
                                title: "Expense Tracking",
                                desc: "Log your personal spending and split household bills easily."
                            },
                            {
                                icon: Users,
                                color: "text-purple-400",
                                title: "Household Sync",
                                desc: "Invite a partner or roommate only when you're ready to collaborate."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300 animate-in slide-in-from-bottom-4 fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className={`p-3 rounded-xl bg-white/5 ${feature.color}`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-100 text-sm">{feature.title}</h3>
                                    {/* ⚡ FIX: Removed 'feature.description' which caused the TS error */}
                                    <p className="text-xs text-slate-400 leading-snug mt-0.5">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <Button
                        onClick={onStart}
                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
                    >
                        Get Started <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                        Secure. Private. Synchronized.
                    </p>
                </div>
            </div>
        </div>
    );
}