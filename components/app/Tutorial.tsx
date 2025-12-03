"use client"

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CheckCircle2, ArrowRight, Sparkles, Plus, Users, Wallet, Target, Bell, ShieldCheck, X } from "lucide-react";

const steps = [
    {
        title: "Welcome to ListNer",
        desc: "Your personal finance & list command center. Sync your life across all your devices.",
        icon: Sparkles,
        color: "bg-indigo-100 text-indigo-600",
    },
    {
        title: "Track & Split Finances",
        desc: "Monitor expenses, budgets, and track IOUs. Switch between 'Household' and 'Solo' modes anytime.",
        icon: Wallet,
        color: "bg-emerald-100 text-emerald-600",
    },
    {
        title: "Sync & Secure",
        desc: "Changes happen instantly on all devices. Your data is encrypted and safe.",
        icon: ShieldCheck,
        color: "bg-blue-100 text-blue-600",
    },
    {
        title: "Stay Notified",
        desc: "Get push alerts when items are added or completed. Never miss a grocery run again.",
        icon: Bell,
        color: "bg-amber-100 text-amber-600",
    },
    {
        title: "Achieve Goals",
        desc: "Set savings goals like 'New Laptop' and track progress visually with Wishlists.",
        icon: Target,
        color: "bg-purple-100 text-purple-600",
    },
    {
        title: "The Magic Button",
        desc: "Tap the floating '+' button anywhere to quickly add expenses, items, or goals.",
        icon: Plus,
        color: "bg-slate-900 text-white",
    }
];

export function Tutorial({ onComplete, onClose }: { onComplete: () => void, onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const isOpen = true;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const StepIcon = steps[currentStep].icon;

    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-white gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-0">
                    <DialogTitle className="sr-only">ListNer Tutorial</DialogTitle>
                </DialogHeader>

                {/* ⚡ NEW: Temporary Dismiss Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/5 hover:bg-black/10 text-slate-500 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="h-64 relative overflow-hidden flex items-center justify-center bg-slate-50">
                    <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-indigo-50 rounded-full blur-3xl opacity-60" />
                    <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-emerald-50 rounded-full blur-3xl opacity-60" />

                    <div key={currentStep} className={`relative z-10 h-28 w-28 rounded-3xl flex items-center justify-center shadow-xl transition-all duration-500 ${steps[currentStep].color} animate-in zoom-in-50 slide-in-from-bottom-4`}>
                        <StepIcon className="w-14 h-14" />
                    </div>
                </div>

                <div className="px-8 pb-10 pt-8 text-center">
                    <div className="min-h-[100px] space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500" key={currentStep}>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{steps[currentStep].title}</h2>
                        <p className="text-slate-500 text-base leading-relaxed font-medium px-2">{steps[currentStep].desc}</p>
                    </div>

                    <div className="flex justify-center gap-2 mb-8">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-slate-900' : 'w-1.5 bg-slate-200'}`}
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <Button onClick={handleNext} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white text-base rounded-2xl shadow-xl shadow-slate-200 font-bold transition-all active:scale-95">
                            {currentStep === steps.length - 1 ? "Start Using ListNer" : "Next"}
                            {currentStep === steps.length - 1 ? <CheckCircle2 className="ml-2 w-5 h-5" /> : <ArrowRight className="ml-2 w-5 h-5 opacity-60" />}
                        </Button>

                        {/* Permanent Skip */}
                        <button onClick={onComplete} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider">
                            Don't show this again
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}