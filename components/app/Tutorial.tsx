//
"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Target, Users, Lock, ChevronRight, X } from "lucide-react";

export function Tutorial({ onComplete, onClose }: { onComplete: () => void, onClose: () => void }) {
    const [index, setIndex] = useState(0);

    const slides = [
        {
            icon: Target,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
            title: "Your Goals, Your Way",
            desc: "Create personal wishlists to track your savings. Keep them private for your eyes only, or toggle them to 'Shared' when you're ready to plan together."
        },
        {
            icon: ShoppingCart,
            color: "text-lime-600",
            bg: "bg-lime-100",
            title: "Smarter Shopping",
            desc: "Build your grocery or to-do lists. Add items, set priorities, and check them off. It's the ultimate pocket organizer."
        },
        {
            icon: Lock,
            color: "text-rose-600",
            bg: "bg-rose-100",
            title: "Private & Secure",
            desc: "Your data stays yours. We use industry-grade encryption, ensuring your personal expenses and lists remain completely private"
        },
        {
            icon: Users,
            color: "text-teal-600",
            bg: "bg-teal-100",
            title: "Sync Your Home",
            desc: "Living with someone? Use the Sync button to invite a partner. You'll instantly share selected lists and track household expenses."
        }
    ];

    const handleNext = () => {
        if (index < slides.length - 1) setIndex(index + 1);
        else onComplete();
    };

    const CurrentIcon = slides[index].icon;

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Top Bar */}
            <div className="flex justify-between items-center p-6 pt-12">
                <div className="flex gap-1">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`}
                        />
                    ))}
                </div>
                <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                    SKIP
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto w-full">
                <div key={index} className="animate-in slide-in-from-right-12 fade-in duration-500 flex flex-col items-center w-full">
                    <div className="mb-12 relative">
                        <div className={`absolute inset-0 ${slides[index].bg} blur-2xl opacity-50 rounded-full scale-150`}></div>
                        <div className={`w-32 h-32 rounded-[2rem] ${slides[index].bg} ${slides[index].color} flex items-center justify-center shadow-xl relative z-10 rotate-3 transition-transform duration-500`}>
                            <CurrentIcon className="w-16 h-16" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                        {slides[index].title}
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">
                        {slides[index].desc}
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-8 pb-12 max-w-md mx-auto w-full">
                <Button
                    onClick={handleNext}
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 group"
                >
                    {index === slides.length - 1 ? "Let's Go" : "Continue"}
                    {index === slides.length - 1 ?
                        <Check className="w-5 h-5 ml-2" /> :
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    }
                </Button>
            </div>
        </div>
    )
}