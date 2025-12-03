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
import { Badge } from "@/components/ui/badge"
import {
    Camera, LogOut, Loader2, UserMinus, Shield, AlertTriangle, Home,
    User as UserIcon, Smartphone, Moon, Mail, Key,
    HelpCircle, Users, CloudOff, RefreshCw, Star, Share2, Lock
} from "lucide-react"
import { COUNTRIES, CURRENCIES } from "@/lib/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Capacitor } from "@capacitor/core"
import { App as CapApp } from "@capacitor/app"
import { Share } from '@capacitor/share'
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"

/* eslint-disable @next/next/no-img-element */

// --- LOCAL UTILS FOR CACHE ---
const clearCache = () => {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('listner_cache_')) {
            localStorage.removeItem(key);
        }
    });
};

const getCacheSize = () => {
    if (typeof window === 'undefined') return '0 KB';
    let total = 0;
    for (const key in localStorage) {
        if (key.startsWith('listner_cache_')) {
            const value = localStorage.getItem(key);
            if (value) total += value.length * 2; // Approximate size in bytes
        }
    }
    return (total / 1024).toFixed(2) + ' KB';
};

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

function AlertDialog({ isOpen, onOpenChange, title, description }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle className="flex items-center gap-2 text-slate-800">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
                <DialogFooter><Button onClick={() => onOpenChange(false)} className="w-full bg-slate-900 text-white">OK</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function SettingsView({ user, household }: { user: User, household: Household }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyType, setVerifyType] = useState<'leave' | 'delete'>('leave');
    const [verifyInput, setVerifyInput] = useState("");
    const [appVersion, setAppVersion] = useState("Web");
    const [cacheSize, setCacheSize] = useState("0 KB");

    // Alert State
    const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, desc: string }>({ isOpen: false, title: '', desc: '' });
    const showAlert = (title: string, desc: string) => setAlertInfo({ isOpen: true, title, desc });

    // Feature State
    const [rating, setRating] = useState(0);
    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

    const [name, setName] = useState(user.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
    const [hhForm, setHhForm] = useState({
        name: household.name,
        country: household.country || "Nigeria",
        currency: household.currency || "NGN",
        avatar_url: household.avatar_url || ""
    });

    const joinedDate = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const userFileRef = useRef<HTMLInputElement>(null);
    const householdFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function init() {
            if (Capacitor.isNativePlatform()) {
                try {
                    const info = await CapApp.getInfo();
                    setAppVersion(`${info.version} (${info.build})`);
                } catch (e) { }
            }

            const size = getCacheSize();
            setCacheSize(size);
        }
        init();

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

    const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
        if (Capacitor.isNativePlatform()) {
            try { await Haptics.impact({ style }); } catch (e) { }
        }
    };

    const triggerNotificationHaptic = async (type: NotificationType) => {
        if (Capacitor.isNativePlatform()) {
            try { await Haptics.notification({ type }); } catch (e) { }
        }
    }

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
            triggerNotificationHaptic(NotificationType.Success);
            showAlert("Success", "Profile photo updated!");
        } catch (err: any) { showAlert("Error", err.message); } finally { setUploading(false); }
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
            triggerNotificationHaptic(NotificationType.Success);
            showAlert("Success", "Household icon updated!");
        } catch (err: any) { showAlert("Error", err.message); } finally { setUploading(false); }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
        setLoading(false);
        if (error) showAlert("Error", error.message);
        else {
            triggerNotificationHaptic(NotificationType.Success);
            showAlert("Updated", "Profile name updated.");
        }
    }

    const handleSaveHousehold = async () => {
        if (!amIAdmin) return;
        setLoading(true);
        triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.from('households').update({ name: hhForm.name, country: hhForm.country, currency: hhForm.currency }).eq('id', household.id);
        setLoading(false);
        if (error) showAlert("Error", error.message);
        else {
            triggerNotificationHaptic(NotificationType.Success);
            showAlert("Updated", "Household details updated.");
        }
    }

    const triggerVerification = (type: 'leave' | 'delete') => {
        triggerHaptic(ImpactStyle.Medium);
        if (type === 'leave' && amIAdmin && members.length === 1) {
            setVerifyType('delete');
            setVerifyOpen(true);
            return;
        }
        if (type === 'leave' && amIAdmin && members.length > 1) return showAlert("Action Blocked", "Owner cannot leave. Transfer ownership or delete household.");
        setVerifyType(type); setVerifyInput(""); setVerifyOpen(true);
    }

    const handleVerifiedAction = async () => {
        const requiredText = verifyType === 'leave' ? 'LEAVE' : household.name;
        if (verifyInput !== requiredText) return showAlert("Error", "Verification failed. Check spelling.");

        setLoading(true);
        triggerHaptic(ImpactStyle.Heavy);

        if (verifyType === 'leave') {
            const { error } = await supabase.from('household_members').delete().eq('user_id', user.id).eq('household_id', household.id);
            if (!error) window.location.reload(); else showAlert("Error", error.message);
        } else {
            const { error } = await supabase.from('households').delete().eq('id', household.id);
            if (!error) window.location.reload(); else showAlert("Error", error.message);
        }
        setLoading(false);
    }

    const confirmRemoveMember = async () => {
        if (!removeMemberId) return;
        triggerHaptic(ImpactStyle.Medium);

        const { error } = await supabase.from('household_members').delete().eq('user_id', removeMemberId).eq('household_id', household.id);

        setRemoveMemberId(null); // Close dialog first

        if (!error) {
            setMembers(members.filter(m => m.id !== removeMemberId));
            triggerNotificationHaptic(NotificationType.Success);
            showAlert("Removed", "Member has been removed from household.");
        } else {
            showAlert("Error", error.message);
        }
    }

    const handleClearCache = () => {
        triggerHaptic(ImpactStyle.Medium);
        clearCache();
        setCacheSize("0 KB");
        showAlert("Success", "Offline cache cleared.");
    }

    const handleRateApp = (stars: number) => {
        setRating(stars);
        triggerHaptic(ImpactStyle.Medium);
        // In a real app, save this to DB
        showAlert("Thank You!", "Your feedback helps us improve.");
    }

    const handleShareApp = async () => {
        triggerHaptic(ImpactStyle.Medium);
        const url = 'https://listner.site/';
        const msg = 'Check out ListNer - The best app for household lists and finance tracking!';

        try {
            if (Capacitor.isNativePlatform()) {
                await Share.share({
                    title: 'Share ListNer',
                    text: msg,
                    url: url,
                    dialogTitle: 'Share with friends',
                });
            } else if (navigator.share) {
                await navigator.share({ title: 'ListNer', text: msg, url });
            } else {
                await navigator.clipboard.writeText(`${msg} ${url}`);
                showAlert("Copied", "Link copied to clipboard!");
            }
        } catch (error) {
            console.error("Share failed:", error);
        }
    }

    // Identify Provider
    const provider = user.app_metadata.provider || 'email';
    const isEmail = provider === 'email';

    return (
        <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-500">
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1 rounded-xl h-12">
                    <TabsTrigger value="profile" onClick={() => triggerHaptic()} className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-lg transition-all"><UserIcon className="w-4 h-4" /> Profile</TabsTrigger>
                    <TabsTrigger value="household" onClick={() => triggerHaptic()} className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm rounded-lg transition-all"><Home className="w-4 h-4" /> Household</TabsTrigger>
                    <TabsTrigger value="app" onClick={() => triggerHaptic()} className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all"><Smartphone className="w-4 h-4" /> App</TabsTrigger>
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
                            {/* Date Joined Badge */}
                            <Badge variant="secondary" className="mt-2 text-[10px] font-normal bg-slate-100 text-slate-500">Joined {joinedDate}</Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="bg-white h-12 rounded-xl" />
                        </div>

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

                    <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base shadow-lg shadow-indigo-100 rounded-xl font-bold">
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>

                    <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl" onClick={async () => { triggerHaptic(ImpactStyle.Medium); await supabase.auth.signOut(); window.location.reload(); }}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </TabsContent>

                {/* --- TAB 2: HOUSEHOLD --- */}
                <TabsContent value="household" className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
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
                                    {/* Renamed Label */}
                                    <h3 className="font-bold text-slate-800 text-lg">Household Image</h3>
                                    <p className="text-xs text-slate-500">{amIAdmin ? "Replace default image with your custom photo." : "View only."}</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label>Name</Label><Input value={hhForm.name} onChange={e => setHhForm({ ...hhForm, name: e.target.value })} disabled={!amIAdmin} className="focus:ring-emerald-500 rounded-xl" /></div>
                                <div className="space-y-2"><Label>Currency</Label><Select value={hhForm.currency} onValueChange={c => setHhForm({ ...hhForm, currency: c })} disabled={!amIAdmin}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Country</Label><Select value={hhForm.country} onValueChange={c => setHhForm({ ...hhForm, country: c })} disabled={!amIAdmin}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            </div>

                            {amIAdmin && <div className="flex justify-end"><Button onClick={handleSaveHousehold} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 rounded-xl">Update Household</Button></div>}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-2xl">
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
                                        {/* Remove Button with State Trigger */}
                                        {amIAdmin && m.id !== user.id && <Button variant="ghost" size="sm" onClick={() => setRemoveMemberId(m.id)} className="h-8 w-8 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"><UserMinus className="w-4 h-4" /></Button>}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-rose-100 bg-rose-50/20 shadow-sm rounded-2xl">
                        <CardHeader>
                            <CardTitle>
                                <div className="text-rose-700 flex items-center gap-2 text-sm">
                                    <Lock className="w-4 h-4" /> Access & Membership
                                </div>
                            </CardTitle>
                        </CardHeader>
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
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {/* Offline Data */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-amber-50 rounded-lg"><CloudOff className="w-5 h-5 text-amber-600" /></div>
                                    <div><p className="font-medium text-sm">Offline Data</p><p className="text-xs text-slate-500">Cache Size: {cacheSize}</p></div>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleClearCache}><RefreshCw className="w-3 h-3 mr-2" /> Clear</Button>
                            </div>
                            <Separator />

                            {/* Rate App */}
                            <div className="flex flex-col items-center py-2 gap-2">
                                <p className="text-sm font-bold text-slate-700">Rate ListNer</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-8 h-8 cursor-pointer transition-all ${star <= rating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                                            onClick={() => handleRateApp(star)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <Separator />

                            {/* Share App */}
                            <div className="flex items-center justify-between cursor-pointer" onClick={handleShareApp}>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg"><Share2 className="w-5 h-5 text-blue-600" /></div>
                                    <div><p className="font-medium text-sm">Share App</p><p className="text-xs text-slate-500">Invite friends to ListNer</p></div>
                                </div>
                                <Button variant="ghost" size="sm">Share</Button>
                            </div>
                            <Separator />

                            {/* Dark Mode (Coming Soon) */}
                            <div className="flex items-center justify-between opacity-60">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg"><Moon className="w-5 h-5 text-slate-600" /></div>
                                    <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-slate-500">Coming Soon</p></div>
                                </div>
                                <Switch disabled />
                            </div>
                            <Separator />

                            {/* Support */}
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => window.open('mailto:aliyuiliyasu15@hotmail.com?subject=ListNer%20Support', '_blank')}>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg"><HelpCircle className="w-5 h-5 text-indigo-600" /></div>
                                    <div><p className="font-medium text-sm">Contact Support</p><p className="text-xs text-slate-500">Having trouble? Email us.</p></div>
                                </div>
                                <Button variant="ghost" size="sm">Email</Button>
                            </div>
                            <Separator />

                            {/* Version Info */}
                            <div className="text-center pt-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ListNer {appVersion}</p>
                                <p className="text-[10px] text-slate-300 mt-1">© 2025 ListNer Inc.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Leave/Delete Verification Dialog */}
            <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> Confirm Action</DialogTitle><DialogDescription>Type <strong>{verifyType === 'leave' ? 'LEAVE' : household.name}</strong> to confirm.</DialogDescription></DialogHeader>
                    <Input value={verifyInput} onChange={e => setVerifyInput(e.target.value)} placeholder="Type here..." className="border-rose-200 focus:ring-rose-500" />
                    <DialogFooter><Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleVerifiedAction} disabled={loading || (verifyType === 'leave' ? verifyInput !== 'LEAVE' : verifyInput !== household.name)}>{loading ? "Processing..." : "Confirm"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for Member Removal */}
            <Dialog open={!!removeMemberId} onOpenChange={(o) => !o && setRemoveMemberId(null)}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Remove Member?</DialogTitle>
                        <DialogDescription>Are you sure? They will lose access to all shared lists and finance data. This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setRemoveMemberId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRemoveMember}>Remove</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic Alert */}
            <AlertDialog isOpen={alertInfo.isOpen} onOpenChange={(o) => setAlertInfo({ ...alertInfo, isOpen: o })} title={alertInfo.title} description={alertInfo.desc} />
        </div>
    )
}