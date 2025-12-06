//
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Capacitor } from "@capacitor/core"
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
    Loader2, Home, Users, ArrowRight,
    ChevronLeft, Plus, Sparkles, QrCode
} from "lucide-react"

export function CreateHouseholdForm({ user, onHouseholdCreated }: { user: User, onHouseholdCreated: (user: User) => void }) {
    const [view, setView] = useState<'choice' | 'create_input' | 'join_input'>('choice');

    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleHouseholdSubmit = async (overrideCode?: string) => {
        const codeToUse = overrideCode || inviteCode;
        setLoading(true); setError(null);

        try {
            if (view === 'create_input') {
                const { data: hh, error: hhError } = await supabase.from('households').insert({
                    name: name,
                    currency: 'NGN',
                    country: 'Nigeria',
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

            // ⚡ FIX: Add delay and verification to prevent race condition where page.tsx queries too early
            setLoading(true);
            let retries = 5;
            while (retries > 0) {
                const { data: verify } = await supabase.from('household_members').select('id').eq('user_id', user.id).maybeSingle();
                if (verify) break;
                await new Promise(r => setTimeout(r, 800));
                retries--;
            }

            onHouseholdCreated(user);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally { setLoading(false); }
    };

    const handleScan = async () => {
        if (!Capacitor.isNativePlatform()) {
            alert("QR Code scanner is only available on the mobile app.");
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
                setInviteCode(barcodes[0].rawValue);
                handleHouseholdSubmit(barcodes[0].rawValue);
            }
        } catch (e: any) {
            if (!e.message?.includes('canceled')) alert("Scanner error: " + e.message);
        }
    };

    if (view === 'choice') {
        return (
            <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 overflow-hidden">
                <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-4 mb-2">
                        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-lime-100 flex items-center justify-center mx-auto mb-6">
                            <img src="/logo-icon.png" alt="ListNer" className="w-12 h-12 object-contain" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Setup your space</h1>
                        <p className="text-slate-500 font-medium">Choose how you want to start.</p>
                    </div>
                    <button onClick={() => setView('create_input')} className="group relative flex items-center p-5 bg-white/90 backdrop-blur-sm border-2 border-white rounded-[2rem] shadow-lg shadow-lime-100/50 hover:border-lime-600 hover:shadow-lime-200 transition-all duration-300 text-left active:scale-95">
                        <div className="h-14 w-14 rounded-2xl bg-lime-50 text-lime-600 flex items-center justify-center mr-5"><Plus className="w-7 h-7" /></div>
                        <div className="flex-1"><h3 className="font-bold text-slate-900 text-lg">Create New</h3><p className="text-xs text-slate-500 mt-1 font-medium leading-tight">Create a new Listner space for your household.</p></div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-lime-600 group-hover:translate-x-1 transition-all" />
                    </button>
                    <button onClick={() => setView('join_input')} className="group relative flex items-center p-5 bg-white/90 backdrop-blur-sm border-2 border-white rounded-[2rem] shadow-lg shadow-emerald-100/50 hover:border-emerald-600 hover:shadow-emerald-200 transition-all duration-300 text-left active:scale-95">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-5"><Users className="w-7 h-7" /></div>
                        <div className="flex-1"><h3 className="font-bold text-slate-900 text-lg">Join Existing</h3><p className="text-xs text-slate-500 mt-1 font-medium leading-tight">Join using a code from a member.</p></div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'create_input' || view === 'join_input') {
        const isCreate = view === 'create_input';
        return (
            <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 overflow-hidden">
                <Card className="relative z-10 w-full max-w-sm border-none shadow-2xl bg-white/95 backdrop-blur rounded-[2rem] p-8 overflow-hidden animate-in slide-in-from-right-8 duration-300">
                    <button onClick={() => { setView('choice'); setError(null); }} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="mt-8 text-center space-y-6">
                        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-md ${isCreate ? 'bg-lime-100 text-lime-600' : 'bg-emerald-100 text-emerald-600'}`}>{isCreate ? <Home className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}</div>
                        <div className="space-y-2"><h2 className="text-2xl font-bold text-slate-900">{isCreate ? "Name your space" : "Enter Invite Code"}</h2><p className="text-sm text-slate-500">{isCreate ? "e.g. My Apartment, The Smiths" : "Enter code or scan QR from owner."}</p></div>
                        <div className="space-y-4 pt-2">
                            {isCreate ? (
                                <Input autoFocus placeholder="Household Name" value={name} onChange={e => setName(e.target.value)} className="h-14 text-lg bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-lime-500" />
                            ) : (
                                <div className="flex gap-2"><Input autoFocus placeholder="A1B2C3" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="h-14 text-xl font-mono tracking-[0.3em] uppercase bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-emerald-500 flex-1" maxLength={6} /><Button onClick={handleScan} className="h-14 w-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-md flex-shrink-0" title="Scan QR"><QrCode className="w-6 h-6" /></Button></div>
                            )}
                            {error && <div className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl animate-in shake">{error}</div>}
                            <Button onClick={() => handleHouseholdSubmit()} disabled={loading || (isCreate ? !name.trim() : inviteCode.length < 3)} className={`w-full h-12 text-base font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${isCreate ? 'bg-lime-600 hover:bg-lime-700 shadow-lime-200 text-slate-900' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white'}`}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isCreate ? "Continue" : "Join Now")}</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }
    return null;
}