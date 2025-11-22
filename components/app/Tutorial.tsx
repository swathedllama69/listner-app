import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ListChecks, CheckCircle2, ArrowRight, Sparkles, Plus, Users, Wallet } from "lucide-react";

// The custom VisuallyHiddenTitle is removed, and sr-only is applied directly to DialogTitle.

const steps = [
    {
        title: "Welcome to ListNer",
        desc: "Your shared command center for home life. Sync expenses, lists, and goals with your partner effortlessly.",
        icon: Sparkles,
        color: "bg-indigo-100 text-indigo-600",
    },
    {
        title: "Track Shared Finances",
        desc: "Log expenses and see who owes whom instantly. No more math, no more awkward money talks.",
        icon: Wallet,
        color: "bg-emerald-100 text-emerald-600",
    },
    {
        title: "Smart Shopping Lists",
        desc: "Real-time sync means you never buy the same milk twice. Tap items to edit, check to complete.",
        icon: ShoppingCart,
        color: "bg-blue-100 text-blue-600",
    },
    {
        title: "Collaborate",
        desc: "Invite your household members via the dashboard. Everyone sees the same data in real-time.",
        icon: Users,
        color: "bg-amber-100 text-amber-600",
    },
    {
        title: "The Magic Button",
        desc: "The floating '+' button is your superpower. Use it to quickly add anything, anywhere.",
        icon: Plus,
        color: "bg-slate-900 text-white",
    }
];

export function Tutorial({ onComplete }: { onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const isOpen = true;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    }

    const StepIcon = steps[currentStep].icon;

    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {/* ACCESSIBILITY FIX: DialogTitle with sr-only class */}
                <DialogHeader className="p-0">
                    <DialogTitle className="sr-only">ListNer Quick Start Tutorial</DialogTitle>
                </DialogHeader>

                {/* Visual Header */}
                <div className="h-48 relative overflow-hidden flex items-center justify-center bg-slate-50">
                    {/* Abstract Background Blobs */}
                    <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-indigo-100/50 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-lime-100/50 rounded-full blur-3xl" />

                    {/* Icon Container */}
                    <div className={`relative z-10 h-24 w-24 rounded-full flex items-center justify-center shadow-sm transition-all duration-500 ${steps[currentStep].color} animate-in zoom-in-50`}>
                        <StepIcon className="w-10 h-10" />
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 pt-6 text-center">
                    <div className="min-h-[120px] space-y-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500" key={currentStep}>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{steps[currentStep].title}</h2>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">{steps[currentStep].desc}</p>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center gap-1.5 mb-8">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`}
                            />
                        ))}
                    </div>

                    <div className="space-y-3">
                        <Button onClick={handleNext} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95">
                            {currentStep === steps.length - 1 ? "Let's Go!" : "Next"}
                            {currentStep === steps.length - 1 ? <CheckCircle2 className="ml-2 w-4 h-4" /> : <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                        <button onClick={handleSkip} className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                            Skip Tutorial
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}