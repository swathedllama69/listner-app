"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Home, Users, ArrowRight, Camera, User as UserIcon, CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Helper for image compression (Reused)
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
    // STEP 1: Household | STEP 2: Profile
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 State
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'create' | 'join'>('create')
    const [name, setName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [error, setError] = useState<string | null>(null)

    // Step 2 State
    const [displayName, setDisplayName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STEP 1 LOGIC ---
    const handleHouseholdSubmit = async () => {
        setLoading(true); setError(null);
        try {
            if (mode === 'create') {
                const { data: hh, error: hhError } = await supabase.from('households').insert({
                    name: name,
                    currency: 'NGN', // Default, can be changed in settings
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
                // Join Logic
                const { data: hh, error: fetchError } = await supabase.from('households').select('id').eq('invite_code', inviteCode.toUpperCase()).single();
                if (fetchError || !hh) throw new Error("Invalid invite code");

                const { error: joinError } = await supabase.from('household_members').insert({
                    user_id: user.id,
                    household_id: hh.id,
                    is_owner: false,
                    role: 'member'
                });
                if (joinError) throw joinError;
            }
            // Move to Step 2
            setStep(2);
        } catch (err: any) {
            setError(err.message);
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
            await supabase.storage.from('images').upload(path, compressed);
            const { data } = supabase.storage.from('images').getPublicUrl(path);
            setAvatarUrl(data.publicUrl);
        } catch (e) { console.error(e); } finally { setUploading(false); }
    };

    const handleProfileSubmit = async () => {
        setLoading(true);
        try {
            await supabase.auth.updateUser({
                data: { full_name: displayName, avatar_url: avatarUrl }
            });
            await supabase.from('profiles').upsert({
                id: user.id,
                full_name: displayName,
                avatar_url: avatarUrl,
                email: user.email
            });
            // Complete
            onHouseholdCreated(user);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // --- RENDER ---

    if (step === 1) {
        return (
            <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-slate-50 animate-in fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Home className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Setup your space</h1>
                    <p className="text-slate-500 mt-2 max-w-xs mx-auto">Create a new digital home or join an existing one.</p>
                </div>

                <Card className="w-full max-w-md border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                        <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setError(null); }} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 p-0 bg-slate-100 h-14">
                                <TabsTrigger value="create" className="h-full rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 font-medium">Create New</TabsTrigger>
                                <TabsTrigger value="join" className="h-full rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 font-medium">Join Existing</TabsTrigger>
                            </TabsList>
                            <div className="p-8 space-y-6">
                                {mode === 'create' ? (
                                    <div className="space-y-4 animate-in slide-in-from-left-4 fade-in">
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3">
                                            <Home className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                            <div className="text-xs text-indigo-800 leading-relaxed">
                                                <strong>Start fresh.</strong> Create a space for your household. You can invite members later.
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Name your household</Label>
                                            <Input placeholder="e.g. My Family, The Smiths" value={name} onChange={e => setName(e.target.value)} className="h-12 bg-slate-50 border-slate-200" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex gap-3">
                                            <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                            <div className="text-xs text-purple-800 leading-relaxed">
                                                <strong>Sync up.</strong> Join a member to sync lists. You can still create private lists or share specific ones within the household.
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Enter Invite Code</Label>
                                            <Input placeholder="e.g. A1B2C3" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="h-12 bg-slate-50 border-slate-200 uppercase tracking-widest font-mono text-center text-lg" maxLength={6} />
                                        </div>
                                    </div>
                                )}

                                {error && <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {error}</div>}

                                <Button onClick={handleHouseholdSubmit} disabled={loading || (mode === 'create' ? !name : !inviteCode)} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-base font-bold rounded-xl">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'create' ? "Create Household" : "Join Household")}
                                </Button>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // STEP 2: PROFILE
    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-slate-50 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">One last thing</h1>
                <p className="text-slate-500 mt-2">Set up your profile so others know it's you.</p>
            </div>

            <Card className="w-full max-w-md border-none shadow-xl bg-white rounded-3xl p-8 space-y-8">
                {/* Image Upload */}
                <div className="flex justify-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="h-32 w-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-12 h-12 text-slate-300" />}
                            {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full border-4 border-white shadow-sm"><Camera className="w-4 h-4" /></div>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                        placeholder="What should we call you?"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="h-12 bg-slate-50 border-slate-200 text-center text-lg"
                    />
                </div>

                <Button onClick={handleProfileSubmit} disabled={loading || !displayName} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-xl shadow-lg shadow-indigo-200">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Looks Good!"} <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
            </Card>
        </div>
    );
}