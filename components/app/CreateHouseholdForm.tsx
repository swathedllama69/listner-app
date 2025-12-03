"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, Home, Users, ArrowRight, Camera, User as UserIcon, CheckCircle2, ChevronLeft, Plus, Sparkles } from "lucide-react"

// Helper: Compress Image
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
    // STATE MACHINE: 'choice' -> 'create_input' | 'join_input' -> 'profile'
    const [view, setView] = useState<'choice' | 'create_input' | 'join_input' | 'profile'>('choice');

    // Step 1 State
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [error, setError] = useState<string | null>(null)

    // Step 2 State (Profile)
    const [displayName, setDisplayName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STEP 1 LOGIC ---
    const handleHouseholdSubmit = async () => {
        setLoading(true); setError(null);
        try {
            if (view === 'create_input') {
                const { data: hh, error: hhError } = await supabase.from('households').insert({
                    name: name,
                    currency: 'NGN',
                    country: 'Nigeria'
                }).select().single();
                if (hhError) throw hhError;

                // Owner link
                const { error: memError } = await supabase.from('household_members').insert({
                    user_id: user.id,
                    household_id: hh.id,
                    is_owner: true,
                    role: 'admin'
                });
                if (memError) throw memError;
            } else {
                // Join Logic
                const { data: hh, error: fetchError } = await supabase.from('households').select('id').eq('invite_code', inviteCode.trim().toUpperCase()).single();
                if (fetchError || !hh) throw new Error("Invalid invite code");

                // Check if already a member to prevent duplicate key error
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
            setView('profile'); // Success -> Move to Profile
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2 LOGIC ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const compressed = await compressImage(file);
            const path = `${user.id}/avatar-${Date.now()}.jpg`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage.from('images').upload(path, compressed);
            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('images').getPublicUrl(path);
            setAvatarUrl(data.publicUrl);
        } catch (e: any) {
            console.error(e);
            alert("Image upload failed: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleProfileSubmit = async () => {
        setLoading(true);
        try {
            // Update Auth Metadata (optional but good for syncing)
            await supabase.auth.updateUser({
                data: { full_name: displayName, avatar_url: avatarUrl }
            });

            // ⚡ FIX: Use UPDATE instead of UPSERT
            // This prevents "username" constraint errors since we only update name/photo
            const { error } = await supabase.from('profiles').update({
                full_name: displayName,
                avatar_url: avatarUrl,
            }).eq('id', user.id);

            if (error) throw error;

            onHouseholdCreated(user); // DONE!
        } catch (e: any) {
            console.error(e);
            // Fallback: If row doesn't exist (rare), try insert without username
            if (e.code === 'PGRST116' || e.message?.includes('not found')) {
                await supabase.from('profiles').insert({
                    id: user.id,
                    full_name: displayName,
                    avatar_url: avatarUrl,
                    email: user.email
                });
                onHouseholdCreated(user);
            } else {
                alert("Profile save failed: " + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER VIEWS ---

    // 1. SELECTION SCREEN (Clean Cards)
    if (view === 'choice') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 animate-in fade-in duration-500">
                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Setup your space</h1>
                    <p className="text-slate-500 text-sm">How would you like to start?</p>
                </div>

                <div className="grid gap-4 w-full max-w-sm">
                    <button
                        onClick={() => setView('create_input')}
                        className="group relative flex items-center p-5 bg-white border-2 border-slate-100 rounded-3xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900">Create New</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Start a fresh household.</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button
                        onClick={() => setView('join_input')}
                        className="group relative flex items-center p-5 bg-white border-2 border-slate-100 rounded-3xl hover:border-purple-600 hover:shadow-xl hover:shadow-purple-100 transition-all duration-300 text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900">Join Existing</h3>
                            <p className="text-xs text-slate-500 mt-0.5">I have an invite code.</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>
        );
    }

    // 2. INPUT SCREENS (Create or Join)
    if (view === 'create_input' || view === 'join_input') {
        const isCreate = view === 'create_input';
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 animate-in slide-in-from-right-8 duration-300">
                <Card className="w-full max-w-sm border-none shadow-xl bg-white rounded-[2rem] p-8 relative overflow-hidden">
                    {/* Back Button */}
                    <button onClick={() => { setView('choice'); setError(null); }} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="mt-8 text-center space-y-6">
                        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm ${isCreate ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                            {isCreate ? <Home className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">{isCreate ? "Name your space" : "Enter Invite Code"}</h2>
                            <p className="text-sm text-slate-500">
                                {isCreate ? "e.g. My Apartment, The Smiths" : "Ask the owner for the 6-digit code."}
                            </p>
                        </div>

                        <div className="space-y-4 pt-2">
                            {isCreate ? (
                                <Input
                                    autoFocus
                                    placeholder="Household Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="h-14 text-lg bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-indigo-500"
                                />
                            ) : (
                                <Input
                                    autoFocus
                                    placeholder="A1B2C3"
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value)}
                                    className="h-14 text-2xl font-mono tracking-[0.5em] uppercase bg-slate-50 border-slate-200 rounded-2xl text-center focus:ring-2 focus:ring-purple-500"
                                    maxLength={6}
                                />
                            )}

                            {error && (
                                <div className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl animate-in shake">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleHouseholdSubmit}
                                disabled={loading || (isCreate ? !name.trim() : inviteCode.length < 3)}
                                className={`w-full h-12 text-base font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${isCreate ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    // 3. PROFILE SETUP (Final Step)
    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-slate-50 animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">One last thing</h1>
                <p className="text-slate-500 mt-2 text-sm">Add a photo so others know it's you.</p>
            </div>

            <Card className="w-full max-w-sm border-none shadow-2xl bg-white rounded-[2rem] p-8 space-y-8">
                {/* Image Upload */}
                <div className="flex justify-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="h-32 w-32 rounded-full bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center transition-all group-hover:scale-105">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-12 h-12 text-slate-300" />
                            )}

                            {/* Overlay when uploading */}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-slate-900 text-white p-2.5 rounded-full border-4 border-white shadow-lg group-hover:bg-indigo-600 transition-colors">
                            <Camera className="w-5 h-5" />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                </div>

                {/* Name Input */}
                <div className="space-y-4">
                    <div className="space-y-2 text-center">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Display Name</Label>
                        <Input
                            placeholder="e.g. John"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="h-14 bg-slate-50 border-slate-200 text-center text-lg font-bold rounded-2xl focus:bg-white transition-all"
                        />
                    </div>

                    <Button
                        onClick={handleProfileSubmit}
                        disabled={loading || !displayName.trim()}
                        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="flex items-center gap-2">All Set <CheckCircle2 className="w-5 h-5" /></span>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}