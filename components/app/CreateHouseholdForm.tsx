"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
    Loader2, Home, Users, ArrowRight, Camera, User as UserIcon,
    CheckCircle2, ChevronLeft, Plus, Sparkles, QrCode, Wallet, ShoppingCart
} from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'

// --- ANIMATION CONFIG ---
const animationItems = [
    { type: '🍎', size: 10, duration: 18, delay: 0, top: '10%', left: '10%', animKey: 'slowDrift1', isEmoji: true, opacity: 0.25 },
    { type: '🛒', size: 11, duration: 15, delay: 15, top: '20%', right: '30%', animKey: 'slowDrift4', isEmoji: true, opacity: 0.2 },
    { type: '🥦', size: 12, duration: 23, delay: 5, top: '50%', right: '5%', animKey: 'slowDrift2', isEmoji: true, opacity: 0.15 },
    { type: '🍌', size: 15, duration: 17, delay: 50, bottom: '20%', right: '50%', animKey: 'slowDrift11', isEmoji: true, opacity: 0.2 },
    { type: '🪑', size: 10, duration: 16, delay: 60, top: '60%', left: '5%', animKey: 'slowDrift13', isEmoji: true, opacity: 0.2 },
    { type: '🖊️', size: 9, duration: 20, delay: 65, bottom: '40%', left: '15%', animKey: 'slowDrift14', isEmoji: true, opacity: 0.25 },
    { Icon: ShoppingCart, color: 'text-lime-400', size: 10, duration: 20, delay: 20, bottom: '25%', right: '15%', animKey: 'slowDrift5', isEmoji: false, opacity: 0.2 },
    { Icon: Wallet, color: 'text-teal-400', size: 12, duration: 18, delay: 25, top: '70%', left: '20%', animKey: 'slowDrift6', isEmoji: false, opacity: 0.25 },
];

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("Canvas error")); return; }
            const MAX = 500;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => {
                if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                else reject(new Error("Compression failed"));
            }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
    });
}

export function CreateHouseholdForm({ user, onHouseholdCreated }: { user: User, onHouseholdCreated: (user: User) => void }) {
    // ⚡ FIX: Removed 'profile' view
    const [view, setView] = useState<'choice' | 'create_input' | 'join_input'>('choice');

    // Step 1 State (Household Setup)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [error, setError] = useState<string | null>(null)

    // ⚡ REMOVED: Profile setup state (displayName, avatarUrl, uploading, fileInputRef) are now only in OnboardingWizard

    const handleHouseholdSubmit = async (overrideCode?: string) => {
        const codeToUse = overrideCode || inviteCode;
        setLoading(true); setError(null);

        try {
            if (view === 'create_input') {
                const { data: hh, error: hhError } = await supabase.from('households').insert({
                    name: name,
                    currency: 'NGN',
                    country: 'Nigeria'
                }).select().single();
                if (hhError) throw hhError;

                const { error: memError } = await supabase.from('household_members').insert({
                    user_id: user.id,
                    household_id: hh.id,
                    is_owner: true,
                    role: 'admin'
                });
                if (memError) throw memError;
            } else {
                if (!codeToUse) throw new Error("Missing invite code");

                const { data: hh, error: fetchError } = await supabase.from('households').select('id').eq('invite_code', codeToUse.trim().toUpperCase()).single();
                if (fetchError || !hh) throw new Error("Invalid invite code");

                const { data: existing } = await supabase.from('household_members').select('id').eq('user_id', user.id).eq('household_id', hh.id).maybeSingle();

                if (!existing) {
                    const { error: joinError } = await supabase.from('household_members').insert({
                        user_id: user.id,
                        household_id: hh.id,
                        is_owner: false,
                        role: 'member'
                    });
                    if (joinError) throw joinError;
                }
            }

            // ⚡ FIX: Call onHouseholdCreated immediately to let app/page.tsx handle the next step (Tutorial -> OnboardingWizard).
            onHouseholdCreated(user);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async () => {
        if (!Capacitor.isNativePlatform()) {
            alert("Scanning is only available on the mobile app.");
            return;
        }

        try {
            const { camera } = await BarcodeScanner.checkPermissions();
            if (camera !== 'granted' && camera !== 'limited') {
                const result = await BarcodeScanner.requestPermissions();
                if (result.camera !== 'granted' && result.camera !== 'limited') return;
            }

            const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });

            if (barcodes.length > 0 && barcodes[0].rawValue) {
                const scannedCode = barcodes[0].rawValue;
                setInviteCode(scannedCode);
                handleHouseholdSubmit(scannedCode); // Auto-submit
            }
        } catch (e: any) {
            if (!e.message?.includes('canceled')) alert("Scanner error: " + e.message);
        }
    };

    // ⚡ REMOVED: handleImageUpload and handleProfileSubmit functions

    // --- BACKGROUND ---
    const AnimatedBackground = () => (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <style jsx global>{`
                @keyframes slowDrift1 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(30px, 60px) rotate(10deg); } 66% { transform: translate(-45px, 15px) rotate(-5deg); } }
                @keyframes slowDrift2 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 40% { transform: translate(-30px, -30px) rotate(-10deg); } 80% { transform: translate(30px, 45px) rotate(5deg); } }
                @keyframes slowDrift4 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-60px, 30px) rotate(20deg); } }
                @keyframes slowDrift5 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 60% { transform: translate(15px, -60px) rotate(-10deg); } }
                @keyframes slowDrift6 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 30% { transform: translate(-45px, -15px) rotate(5deg); } }
                @keyframes slowDrift11 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 40% { transform: translate(45px, 45px) rotate(-10deg); } 80% { transform: translate(-15px, -30px) rotate(5deg); } }
                @keyframes slowDrift13 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-15px, 45px) rotate(-5deg); } }
                @keyframes slowDrift14 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 65% { transform: translate(30px, -30px) rotate(10deg); } }
            `}</style>
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 via-white to-indigo-50/50 opacity-80"></div>
            {animationItems.map((item, index) => {
                const sizeInPixels = item.size * (item.isEmoji ? 4 : 3);
                const IconComponent = item.Icon;
                return (
                    <div key={index} className={`absolute pointer-events-none ${item.color || ''}`} style={{ ...item, width: `${sizeInPixels}px`, height: `${sizeInPixels}px`, animation: `${item.animKey} ${item.duration}s ease-in-out ${item.delay}s infinite alternate`, opacity: item.opacity }}>
                        {item.isEmoji ? <span className="text-4xl drop-shadow-sm" style={{ fontSize: `${sizeInPixels}px` }}>{item.type}</span> : IconComponent && <IconComponent className="w-full h-full" />}
                    </div>
                );
            })}
        </div>
    );

    // --- RENDER ---

    // 1. SELECTION SCREEN
    if (view === 'choice') {
        return (
            <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 overflow-hidden">
                <AnimatedBackground />

                <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-4 mb-2">
                        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center mx-auto mb-6 transform hover:scale-105 transition-transform duration-500">
                            <img src="/logo-icon.png" alt="ListNer" className="w-12 h-12 object-contain" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Setup your space</h1>
                        <p className="text-slate-500 font-medium">Choose how you want to start.</p>
                    </div>

                    <button onClick={() => setView('create_input')} className="group relative flex items-center p-5 bg-white/90 backdrop-blur-sm border-2 border-white rounded-[2rem] shadow-lg shadow-indigo-100/50 hover:border-indigo-600 hover:shadow-indigo-200 transition-all duration-300 text-left active:scale-95">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform shadow-inner">
                            <Plus className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-lg">Create New</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium leading-tight">Create a new Listner space for your household.</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button onClick={() => setView('join_input')} className="group relative flex items-center p-5 bg-white/90 backdrop-blur-sm border-2 border-white rounded-[2rem] shadow-lg shadow-purple-100/50 hover:border-purple-600 hover:shadow-purple-200 transition-all duration-300 text-left active:scale-95">
                        <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mr-5 group-hover:scale-110 transition-transform shadow-inner">
                            <Users className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-lg">Join Existing</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium leading-tight">Join an existing Listner space by scanning or using a code from a household member.</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>
        );
    }

    // 2. INPUT SCREENS
    if (view === 'create_input' || view === 'join_input') {
        const isCreate = view === 'create_input';
        return (
            <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 overflow-hidden">
                <AnimatedBackground />

                <Card className="relative z-10 w-full max-w-sm border-none shadow-2xl bg-white/95 backdrop-blur rounded-[2rem] p-8 overflow-hidden animate-in slide-in-from-right-8 duration-300">
                    <button onClick={() => { setView('choice'); setError(null); }} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="mt-8 text-center space-y-6">
                        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-md ${isCreate ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                            {isCreate ? <Home className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">{isCreate ? "Name your space" : "Enter Invite Code"}</h2>
                            <p className="text-sm text-slate-500">
                                {isCreate ? "e.g. My Apartment, The Smiths" : "Enter code or scan QR from owner."}
                            </p>
                        </div>

                        <div className="space-y-4 pt-2">
                            {isCreate ? (
                                <Input autoFocus placeholder="Household Name" value={name} onChange={e => setName(e.target.value)} className="h-14 text-lg bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-indigo-500" />
                            ) : (
                                <div className="flex gap-2">
                                    <Input autoFocus placeholder="A1B2C3" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="h-14 text-xl font-mono tracking-[0.3em] uppercase bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-purple-500 flex-1" maxLength={6} />
                                    {/* SCAN BUTTON INSIDE JOIN INPUT */}
                                    <Button onClick={handleScan} className="h-14 w-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-md flex-shrink-0" title="Scan QR">
                                        <QrCode className="w-6 h-6" />
                                    </Button>
                                </div>
                            )}

                            {error && <div className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl animate-in shake">{error}</div>}

                            <Button onClick={() => handleHouseholdSubmit()} disabled={loading || (isCreate ? !name.trim() : inviteCode.length < 3)} className={`w-full h-12 text-base font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${isCreate ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}>
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isCreate ? "Continue" : "Join Now")}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return null;
}