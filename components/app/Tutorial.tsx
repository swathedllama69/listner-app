"use client"

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CheckCircle2, ArrowRight, Sparkles, Plus, Users, Check, Wallet, Target, Bell, ShieldCheck, X } from "lucide-react";


export function Tutorial({ onComplete, onClose }: { onComplete: () => void, onClose: () => void }) {
    const [index, setIndex] = useState(0);

    const slides = [
        {
            icon: Target,
            color: "text-purple-600",
            bg: "bg-purple-100",
            title: "Smart Wishlists",
            desc: "Create shared goals or private wishlists. Save towards them together or solo."
        },
        {
            icon: ShoppingCart,
            color: "text-blue-600",
            bg: "bg-blue-100",
            title: "Shopping Sync",
            desc: "Never forget an item again. Your shopping lists sync instantly with everyone in the household."
        },
        {
            icon: Wallet,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
            title: "Track & Split Finances",
            desc: "Switch between Household (shared) and Solo (personal) modes. Track shared bills or private expenses easily."
        },
        {
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
            title: "Sync Your Home",
            desc: "Use the Sync button to invite members. Connect your partner or family to start collaborating."
        }
    ];

    const handleNext = () => {
        if (index < slides.length - 1) setIndex(index + 1);
        else onComplete();
    };

    const CurrentIcon = slides[index].icon;

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Top Bar with SINGLE Close Button */}
            <div className="flex justify-end p-6 pt-12">
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div key={index} className="animate-in slide-in-from-right-8 fade-in duration-500 flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-3xl ${slides[index].bg} ${slides[index].color} flex items-center justify-center mb-10 shadow-lg shadow-black/5`}>
                        <CurrentIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{slides[index].title}</h2>
                    <p className="text-lg text-slate-500 leading-relaxed">{slides[index].desc}</p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-8 pb-12 flex items-center justify-between max-w-md mx-auto w-full">
                {/* Indicators */}
                <div className="flex gap-2">
                    {slides.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`} />
                    ))}
                </div>

                <Button onClick={handleNext} className="h-14 px-8 rounded-2xl bg-slate-900 text-white text-lg font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-transform active:scale-95">
                    {index === slides.length - 1 ? "Get Started" : "Next"}
                    {index === slides.length - 1 ? <Check className="w-5 h-5 ml-2" /> : <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
            </div>
        </div>
    )
}