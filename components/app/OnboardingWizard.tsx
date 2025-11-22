"use client"

import { useState, useRef, FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Household } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User as UserIcon, Camera, ArrowRight, CheckCircle2, Globe, Loader2, Sparkles } from "lucide-react"
import { CURRENCIES, COUNTRIES } from "@/lib/constants"

/* eslint-disable @next/next/no-img-element */

// Native Image Compression
const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("Canvas not supported")); return; }
            const MAX_SIZE = 600;
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error("Compression failed")); return; }
                resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            }, 'image/jpeg', 0.7);
        };
        img.onerror = (error) => reject(error);
    });
}

export function OnboardingWizard({ user, household, onComplete }: { user: User, household: Household, onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // State
    const [name, setName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [country, setCountry] = useState(household.country || "Nigeria");
    const [currency, setCurrency] = useState(household.currency || "NGN");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle Avatar
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const compressed = await compressImage(file);
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('images').upload(filePath, compressed);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
            setAvatarUrl(publicUrl);
        } catch (error: any) {
            alert("Upload failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Save Step 1 (Profile)
    const saveProfile = async () => {
        if (!name.trim()) return alert("Please enter your name.");
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl } });
        setLoading(false);
        if (error) alert(error.message);
        else setStep(2);
    };

    // Save Step 2 (Household) & Finish
    const saveHousehold = async () => {
        setLoading(true);
        // 1. Update Household
        const { error: hhError } = await supabase.from('households').update({ country, currency }).eq('id', household.id);
        if (hhError) { setLoading(false); return alert(hhError.message); }

        // 2. Mark Complete
        const { error: userError } = await supabase.auth.updateUser({ data: { onboarding_complete: true } });
        setLoading(false);
        if (userError) alert(userError.message);
        else onComplete();
    };

    const handleCountryChange = (c: string) => {
        setCountry(c);
        const match = CURRENCIES.find(curr => c.toUpperCase().includes(curr.name.toUpperCase().split(' ')[1] || 'XYZ'));
        if (match) setCurrency(match.code);
    }

    return (
        <Dialog open={true}>
            <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
                {/* Header Graphic */}
                <div className="h-32 bg-gradient-to-br from-teal-900 to-emerald-800 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                        {step === 1 ? <UserIcon className="w-8 h-8 text-white" /> : <Globe className="w-8 h-8 text-white" />}
                    </div>
                </div>

                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <div className="text-center space-y-2">
                                <DialogTitle className="text-2xl font-bold text-slate-900">Welcome to ListNer!</DialogTitle>
                                <DialogDescription>Let's set up your profile so your household knows who you are.</DialogDescription>
                            </div>

                            <div className="flex justify-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-bold text-slate-300">{name ? name[0].toUpperCase() : "?"}</span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-teal-600 p-2 rounded-full text-white shadow-sm border-2 border-white">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah" className="h-12 text-lg bg-slate-50 border-slate-200 focus:bg-white" />
                            </div>

                            <Button onClick={saveProfile} disabled={loading} className="w-full h-12 bg-teal-900 hover:bg-teal-800 text-white text-base rounded-xl">
                                Next Step <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <div className="text-center space-y-2">
                                <DialogTitle className="text-2xl font-bold text-slate-900">Regional Settings</DialogTitle>
                                <DialogDescription>Set your location to format prices correctly.</DialogDescription>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Country</Label>
                                    <Select value={country} onValueChange={handleCountryChange}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex gap-3 items-start">
                                    <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-emerald-800 leading-relaxed">You're all set! You can change these settings anytime from the <strong>Settings</strong> tab.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep(1)} className="h-12 px-6">Back</Button>
                                <Button onClick={saveHousehold} disabled={loading} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base rounded-xl shadow-lg shadow-emerald-200">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Started <CheckCircle2 className="w-5 h-5 ml-2" /></>}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}