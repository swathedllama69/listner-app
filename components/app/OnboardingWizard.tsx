"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Household } from "@/lib/types"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User as UserIcon, Camera, ArrowRight, CheckCircle2, Globe, Loader2, MapPin } from "lucide-react"
import { CURRENCIES, COUNTRIES } from "@/lib/constants"
import { compressImage } from "@/lib/utils"

export function OnboardingWizard({ user, household, onComplete }: { user: User, household: Household, onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Profile State
    const [name, setName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");

    // Household State
    const [country, setCountry] = useState(household.country || "Nigeria");
    const [currency, setCurrency] = useState(household.currency || "NGN");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setLoading(true);
        try {
            const compressed = await compressImage(file);
            const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('images').upload(`${user.id}/${fileName}`, compressed);
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(`${user.id}/${fileName}`);
            setAvatarUrl(data.publicUrl);
        } catch (error: any) {
            console.error("Upload failed", error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!name.trim()) return;
        setLoading(true);

        try {
            // Update Auth Metadata AND Profile Table
            await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl } });
            await supabase.from('profiles').upsert({
                id: user.id,
                full_name: name,
                avatar_url: avatarUrl,
                email: user.email,
                username: user.email?.split('@')[0]
            }, { onConflict: 'id' });

            setLoading(false);
            setStep(2);
        } catch (error: any) {
            console.error("Profile Save Failed:", error);
            setLoading(false);
        }
    };

    const saveHousehold = async () => {
        setLoading(true);
        try {
            await supabase.from('households').update({ country, currency }).eq('id', household.id);
            await supabase.auth.updateUser({ data: { onboarding_complete: true } });
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay for auth prop
            onComplete();
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCountryChange = (c: string) => {
        setCountry(c);
        const match = CURRENCIES.find(curr => c.toUpperCase().includes(curr.name.toUpperCase().split(' ')[1] || 'XYZ'));
        if (match) setCurrency(match.code);
    }

    return (
        <Dialog open={true}>
            <DialogContent
                className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-white gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <div className="h-32 bg-gradient-to-br from-indigo-900 to-indigo-800 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className={`transition-all duration-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md ${step === 1 ? 'bg-indigo-500/30' : 'bg-emerald-500/30'}`}>
                        {step === 1 ? <UserIcon className="w-8 h-8 text-indigo-100" /> : <Globe className="w-8 h-8 text-emerald-100" />}
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-6 text-center space-y-1">
                        <DialogTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {step === 1 ? "Who are you?" : "Where are you?"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {step === 1 ? "Set up your profile identity." : "We'll customize prices for your region."}
                        </DialogDescription>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="flex justify-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center transition-all group-hover:shadow-2xl">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <span className="text-3xl font-bold text-slate-300">{name?.[0]?.toUpperCase() || "?"}</span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-indigo-600 p-2.5 rounded-full text-white shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="ml-1 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Display Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-lg font-medium px-4" />
                            </div>
                            <Button onClick={saveProfile} disabled={loading || !name} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-200 font-bold text-base transition-all active:scale-95">
                                Continue <ArrowRight className="w-5 h-5 ml-2 opacity-60" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="ml-1 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Country</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400 z-10" />
                                        <Select value={country} onValueChange={handleCountryChange}>
                                            <SelectTrigger className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium text-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="ml-1 text-slate-500 font-bold text-[10px] uppercase tracking-wider">Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium text-slate-700 px-4">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setStep(1)} className="h-14 w-20 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-bold">Back</Button>
                                <Button onClick={saveHousehold} disabled={loading} className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-200 font-bold text-base transition-all active:scale-95">
                                    {loading ? "Finishing..." : "All Done"}
                                    {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 ml-2 opacity-60" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}