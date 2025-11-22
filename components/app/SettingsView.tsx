"use client"

import React, { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Household } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// FIXED: Added 'Users' to the import list
import { Camera, LogOut, Settings as SettingsIcon, Loader2, UserMinus, Shield, AlertTriangle, Home, User as UserIcon, Smartphone, Bell, Moon, Lock, Mail, Key, HelpCircle, Users } from "lucide-react"
import { COUNTRIES, CURRENCIES } from "@/lib/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

/* eslint-disable @next/next/no-img-element */

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("Canvas not supported")); return; }
            const MAX_SIZE = 800;
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

export function SettingsView({ user, household }: { user: User, household: Household }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyType, setVerifyType] = useState<'leave' | 'delete'>('leave');
    const [verifyInput, setVerifyInput] = useState("");

    const [name, setName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [hhForm, setHhForm] = useState({
        name: household.name,
        country: household.country || "Nigeria",
        currency: household.currency || "NGN",
        avatar_url: household.avatar_url || ""
    });

    const userFileRef = useRef<HTMLInputElement>(null);
    const householdFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function getMembers() {
            const { data, error } = await supabase.rpc('get_household_members_safe', { target_household_id: household.id });
            if (data) {
                const formatted = data.map((m: any) => ({
                    id: m.user_id,
                    is_owner: m.is_owner,
                    email: m.email,
                    name: m.full_name || m.email?.split('@')[0]
                }));
                setMembers(formatted);
            } else {
                setMembers([{ id: user.id, name: 'Me', is_owner: true }]);
            }
        }
        getMembers();
    }, [household.id, user.id]);

    const amIAdmin = members.length > 0 ? (members.find(m => m.id === user.id)?.is_owner ?? false) : true;

    const handleUserImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const compressed = await compressImage(file);
            const path = `${user.id}/avatar-${Date.now()}.jpg`;
            await supabase.storage.from('images').upload(path, compressed);
            const { data } = supabase.storage.from('images').getPublicUrl(path);
            await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
            setAvatarUrl(data.publicUrl);
            window.location.reload();
        } catch (err: any) { alert(err.message); } finally { setUploading(false); }
    };

    const handleHouseholdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!amIAdmin) return;
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        try {
            const compressed = await compressImage(file);
            const path = `household-${household.id}/icon-${Date.now()}.jpg`;
            await supabase.storage.from('images').upload(path, compressed);
            const { data } = supabase.storage.from('images').getPublicUrl(path);
            await supabase.from('households').update({ avatar_url: data.publicUrl }).eq('id', household.id);
            setHhForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
            window.location.reload();
        } catch (err: any) { alert(err.message); } finally { setUploading(false); }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
        setLoading(false);
        if (error) alert(error.message); else { alert("Profile updated."); window.location.reload(); }
    }

    const handleSaveHousehold = async () => {
        if (!amIAdmin) return;
        setLoading(true);
        const { error } = await supabase.from('households').update({ name: hhForm.name, country: hhForm.country, currency: hhForm.currency }).eq('id', household.id);
        setLoading(false);
        if (error) alert(error.message); else { alert("Household updated."); window.location.reload(); }
    }

    const triggerVerification = (type: 'leave' | 'delete') => {
        if (type === 'leave' && amIAdmin && members.length === 1) {
            if (confirm("You are the only member. Leaving will delete the household. Continue?")) { setVerifyType('delete'); setVerifyOpen(true); return; }
            return;
        }
        if (type === 'leave' && amIAdmin && members.length > 1) return alert("Owner cannot leave. Transfer ownership or delete household.");
        setVerifyType(type); setVerifyInput(""); setVerifyOpen(true);
    }

    const handleVerifiedAction = async () => {
        const requiredText = verifyType === 'leave' ? 'LEAVE' : household.name;
        if (verifyInput !== requiredText) return alert("Verification failed.");
        setLoading(true);
        if (verifyType === 'leave') {
            const { error } = await supabase.from('household_members').delete().eq('user_id', user.id).eq('household_id', household.id);
            if (!error) window.location.reload(); else alert(error.message);
        } else {
            const { error } = await supabase.from('households').delete().eq('id', household.id);
            if (!error) window.location.reload(); else alert(error.message);
        }
        setLoading(false);
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member?")) return;
        const { error } = await supabase.from('household_members').delete().eq('user_id', memberId).eq('household_id', household.id);
        if (!error) setMembers(members.filter(m => m.id !== memberId)); else alert(error.message);
    }

    // Identify Provider
    const provider = user.app_metadata.provider || 'email';
    const isEmail = provider === 'email';

    return (
        <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-500">
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1 rounded-xl h-12">
                    <TabsTrigger value="profile" className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg transition-all"><UserIcon className="w-4 h-4" /> Profile</TabsTrigger>
                    <TabsTrigger value="household" className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm rounded-lg transition-all"><Home className="w-4 h-4" /> Household</TabsTrigger>
                    <TabsTrigger value="app" className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all"><Smartphone className="w-4 h-4" /> App</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: PROFILE --- */}
                <TabsContent value="profile" className="space-y-8">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative group cursor-pointer" onClick={() => userFileRef.current?.click()}>
                            <div className="h-24 w-24 rounded-full bg-white border-4 border-slate-100 shadow-md overflow-hidden">
                                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-2xl font-bold text-indigo-300">{name?.[0]}</div>}
                                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm"><Camera className="w-3 h-3" /></div>
                            <input type="file" ref={userFileRef} hidden accept="image/*" onChange={handleUserImageUpload} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900">{name}</h3>
                            <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="bg-white h-12" />
                        </div>

                        {/* Account Type */}
                        <div className="space-y-2">
                            <Label>Account Type</Label>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                    {isEmail ? <Mail className="w-5 h-5 text-slate-600" /> : <Key className="w-5 h-5 text-orange-500" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 capitalize">{provider} Account</p>
                                    <p className="text-xs text-slate-400">Managed by Supabase Auth</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base shadow-lg shadow-indigo-100">
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>

                    <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </TabsContent>

                {/* --- TAB 2: HOUSEHOLD --- */}
                <TabsContent value="household" className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/50 pb-4">
                            <CardTitle className="text-emerald-800 flex items-center gap-2"><Home className="w-5 h-5" /> Household Details</CardTitle>
                            <CardDescription>Manage your shared space.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-5">
                                <div className={`relative ${amIAdmin ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => amIAdmin && householdFileRef.current?.click()}>
                                    <div className="h-20 w-20 rounded-2xl bg-white border-2 border-emerald-100 shadow-sm overflow-hidden flex items-center justify-center">
                                        {hhForm.avatar_url ? <img src={hhForm.avatar_url} className="w-full h-full object-cover" /> : <Home className="w-8 h-8 text-emerald-200" />}
                                    </div>
                                    {amIAdmin && <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm"><Camera className="w-3 h-3" /></div>}
                                    <input type="file" ref={householdFileRef} hidden accept="image/*" onChange={handleHouseholdImageUpload} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Logo & Branding</h3>
                                    <p className="text-xs text-slate-500">{amIAdmin ? "Tap icon to upload." : "View only."}</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label>Name</Label><Input value={hhForm.name} onChange={e => setHhForm({ ...hhForm, name: e.target.value })} disabled={!amIAdmin} className="focus:ring-emerald-500" /></div>
                                <div className="space-y-2"><Label>Currency</Label><Select value={hhForm.currency} onValueChange={c => setHhForm({ ...hhForm, currency: c })} disabled={!amIAdmin}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Country</Label><Select value={hhForm.country} onValueChange={c => setHhForm({ ...hhForm, country: c })} disabled={!amIAdmin}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            </div>

                            {amIAdmin && <div className="flex justify-end"><Button onClick={handleSaveHousehold} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100">Update Household</Button></div>}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-slate-500" /> Members</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 border rounded-xl bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{m.name?.[0]}</div>
                                        <div><p className="text-sm font-bold text-slate-800">{m.name} {m.id === user.id && "(You)"}</p><p className="text-xs text-slate-500">{m.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.is_owner ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Shield className="w-3 h-3" /> Owner</span> : <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">Member</span>}
                                        {amIAdmin && m.id !== user.id && <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.id)} className="h-8 w-8 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"><UserMinus className="w-4 h-4" /></Button>}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-rose-100 bg-rose-50/20 shadow-sm">
                        <CardHeader><CardTitle className="text-rose-700 flex items-center gap-2 text-sm"><Lock className="w-4 h-4" /> Access & Membership</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm text-slate-700 font-semibold">{amIAdmin ? "Delete Household" : "Leave Household"}</Label>
                                    <p className="text-xs text-slate-500">{amIAdmin ? "Permanently delete this space." : "Remove yourself from this space."}</p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => triggerVerification(amIAdmin ? 'delete' : 'leave')}>{amIAdmin ? "Delete" : "Leave"}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 3: APP --- */}
                <TabsContent value="app" className="space-y-6">
                    <Card className="border-none shadow-sm opacity-60">
                        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg"><Moon className="w-5 h-5 text-slate-600" /></div>
                                    <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-slate-500">Coming Soon</p></div>
                                </div>
                                <Switch disabled />
                            </div>
                            <Separator />
                            {/* SUPPORT BUTTON */}
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => window.open('mailto:aliyuiliyasu15@hotmail.com?subject=ListNer%20Support', '_blank')}>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg"><HelpCircle className="w-5 h-5 text-indigo-600" /></div>
                                    <div><p className="font-medium text-sm">Contact Support</p><p className="text-xs text-slate-500">Having trouble? Email us.</p></div>
                                </div>
                                <Button variant="ghost" size="sm">Email</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> Confirm Action</DialogTitle><DialogDescription>Type <strong>{verifyType === 'leave' ? 'LEAVE' : household.name}</strong> to confirm.</DialogDescription></DialogHeader>
                    <Input value={verifyInput} onChange={e => setVerifyInput(e.target.value)} placeholder="Type here..." className="border-rose-200 focus:ring-rose-500" />
                    <DialogFooter><Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleVerifiedAction} disabled={loading || (verifyType === 'leave' ? verifyInput !== 'LEAVE' : verifyInput !== household.name)}>{loading ? "Processing..." : "Confirm"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}