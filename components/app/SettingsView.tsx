"use client"

import React, { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Household } from "@/lib/types"

// UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// Icons & Utils
import {
    Camera, LogOut, Loader2, UserMinus, Shield, AlertTriangle, Home,
    User as UserIcon, Smartphone, Moon, Mail, Key, Pencil,
    HelpCircle, Users, CloudOff, RefreshCw, Star, Share2, Lock, Check, X,
    ChevronRight, Globe, MessageCircle, CreditCard, MapPin, Bell, Sparkles
} from "lucide-react"
import { COUNTRIES, CURRENCIES } from "@/lib/constants"
import { Capacitor } from "@capacitor/core"
import { App as CapApp } from "@capacitor/app"
import { Share } from '@capacitor/share'
import { PushNotifications } from "@capacitor/push-notifications"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"
import { clearCache, getCacheSize } from "@/lib/offline"

// --- HELPER: Image Compression ---
const compressImage = (file: File): Promise<Blob> => {
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
                resolve(blob);
            }, 'image/jpeg', 0.7);
        };
        img.onerror = (error) => reject(error);
    });
}

// --- COMPONENT: Grid Currency Selector ---
function CurrencySelector({ value, onSelect, disabled }: { value: string, onSelect: (c: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCurrency = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div
                onClick={() => !disabled && setIsOpen(true)}
                className={`flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-lime-50 flex items-center justify-center text-lime-600">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Currency</p>
                        <p className="text-xs text-slate-500">{selectedCurrency.name} ({selectedCurrency.symbol})</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600">{value}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            </div>

            <DialogContent className="max-w-sm rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Currency</DialogTitle>
                    <DialogDescription>Choose your primary household currency.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1 grid grid-cols-2 gap-3 pt-2">
                    {CURRENCIES.map(c => (
                        <button
                            key={c.code}
                            onClick={() => { onSelect(c.code); setIsOpen(false); }}
                            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${value === c.code ? 'bg-lime-50 border-lime-500 shadow-sm ring-1 ring-lime-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                        >
                            <span className="text-2xl font-bold text-slate-800">{c.symbol}</span>
                            <span className="text-sm font-bold text-slate-600">{c.code}</span>
                            <span className="text-[10px] text-slate-400 text-center leading-tight">{c.name}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- COMPONENT: List Country Selector ---
function CountrySelector({ value, onSelect, disabled }: { value: string, onSelect: (c: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div
                onClick={() => !disabled && setIsOpen(true)}
                className={`flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Country</p>
                        <p className="text-xs text-slate-500">Region settings</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600 truncate max-w-[100px]">{value}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            </div>

            <DialogContent className="max-w-sm rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Country</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-1 p-1">
                    {COUNTRIES.map(c => (
                        <button
                            key={c}
                            onClick={() => { onSelect(c); setIsOpen(false); }}
                            className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${value === c ? 'bg-lime-50 text-lime-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                            <span>{c}</span>
                            {value === c && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}


export function SettingsView({ user, household, onSettingsChange }: { user: User, household: Household & { invite_code?: string }, onSettingsChange: () => void }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyType, setVerifyType] = useState<'leave' | 'delete'>('leave');
    const [verifyInput, setVerifyInput] = useState("");
    const [appVersion, setAppVersion] = useState("1.0.0");
    const [cacheSize, setCacheSize] = useState("0 KB");

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
            const size = await getCacheSize();
            setCacheSize(size);
            const { data: ratingData } = await supabase.from('app_ratings').select('rating').eq('user_id', user.id).single();
            if (ratingData) setRating(ratingData.rating);
        }
        init();

        async function getMembers() {
            const { data } = await supabase.rpc('get_household_members_safe', { target_household_id: household.id });
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
        if (Capacitor.isNativePlatform()) { try { await Haptics.impact({ style }); } catch (e) { } }
    };

    const triggerNotificationHaptic = async (type: NotificationType) => {
        if (Capacitor.isNativePlatform()) { try { await Haptics.notification({ type }); } catch (e) { } }
    }

    const amIAdmin = members.length > 0 ? (members.find(m => m.id === user.id)?.is_owner ?? false) : true;

    // --- LOGIC HANDLERS ---

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
            onSettingsChange();
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
            triggerNotificationHaptic(NotificationType.Success);
            onSettingsChange();
        } catch (err: any) { alert(err.message); } finally { setUploading(false); }
    };

    const handleSaveProfile = async () => {
        setLoading(true); triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
        setLoading(false);
        if (error) alert(error.message);
        else { triggerNotificationHaptic(NotificationType.Success); onSettingsChange(); }
    }

    const handleSaveHousehold = async () => {
        if (!amIAdmin) return;
        setLoading(true); triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.from('households').update({ name: hhForm.name, country: hhForm.country, currency: hhForm.currency }).eq('id', household.id);
        setLoading(false);
        if (error) alert(error.message);
        else { triggerNotificationHaptic(NotificationType.Success); onSettingsChange(); }
    }

    const handleCopyInvite = async () => {
        const inviteLink = `https://listner.site/join/${household.invite_code}`;
        if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Join my Household on ListNer', text: `Join my household using this code: ${household.invite_code} or click: `, url: inviteLink }); }
        else { await navigator.clipboard.writeText(inviteLink); alert("Invite link copied!"); }
    }

    const triggerVerification = (type: 'leave' | 'delete') => {
        triggerHaptic(ImpactStyle.Medium);
        if (type === 'leave' && amIAdmin && members.length === 1) { setVerifyType('delete'); setVerifyOpen(true); return; }
        if (type === 'leave' && amIAdmin && members.length > 1) return alert("Owner cannot leave. Transfer ownership or delete household.");
        setVerifyType(type); setVerifyInput(""); setVerifyOpen(true);
    }

    const handleVerifiedAction = async () => {
        const requiredText = verifyType === 'leave' ? 'LEAVE' : household.name;
        if (verifyInput !== requiredText) return alert("Verification failed.");
        setLoading(true); triggerHaptic(ImpactStyle.Heavy);
        if (verifyType === 'leave') {
            const { error } = await supabase.from('household_members').delete().eq('user_id', user.id).eq('household_id', household.id);
            if (!error) window.location.reload(); else alert(error.message);
        } else {
            const { error } = await supabase.from('households').delete().eq('id', household.id);
            if (!error) window.location.reload(); else alert(error.message);
        }
        setLoading(false);
    }

    const confirmRemoveMember = async () => {
        if (!removeMemberId) return; triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.from('household_members').delete().eq('user_id', removeMemberId).eq('household_id', household.id);
        setRemoveMemberId(null);
        if (!error) { setMembers(members.filter(m => m.id !== removeMemberId)); triggerNotificationHaptic(NotificationType.Success); }
        else { alert(error.message); }
    }

    const handleClearCache = async () => { triggerHaptic(ImpactStyle.Medium); await clearCache(); setCacheSize("0 KB"); alert("Cache cleared."); }
    const handleRateApp = async (stars: number) => { setRating(stars); triggerHaptic(ImpactStyle.Medium); const { error } = await supabase.from('app_ratings').upsert({ user_id: user.id, rating: stars, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); }

    // ⚡ BEAUTIFIED & BRANDED SHARE (Lime)
    const handleShareApp = async () => {
        triggerHaptic(ImpactStyle.Medium);
        const url = 'https://listner.site/';
        const msg = 'Organize your household lists and expenses with ListNer!';
        if (Capacitor.isNativePlatform()) {
            await Share.share({ title: 'ListNer', text: msg, url: url, dialogTitle: 'Share with friends' });
        } else if (navigator.share) {
            await navigator.share({ title: 'ListNer', text: msg, url });
        } else {
            await navigator.clipboard.writeText(`${msg} ${url}`);
            alert("Link copied!");
        }
    }

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Tabs defaultValue="profile" className="w-full">

                {/* --- 1. TAB HEADER (Consistent Design) --- */}
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 rounded-2xl h-12">
                    <TabsTrigger value="profile" onClick={() => triggerHaptic()} className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-xs"><UserIcon className="w-4 h-4 mr-2" /> Profile</TabsTrigger>
                    <TabsTrigger value="household" onClick={() => triggerHaptic()} className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-xs"><Home className="w-4 h-4 mr-2" /> Household</TabsTrigger>
                    <TabsTrigger value="app" onClick={() => triggerHaptic()} className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-xs"><Smartphone className="w-4 h-4 mr-2" /> App</TabsTrigger>
                </TabsList>

                {/* --- 2. PROFILE TAB (Clean White) --- */}
                <TabsContent value="profile" className="space-y-6">
                    <div className="bg-white rounded-3xl p-8 flex flex-col items-center shadow-sm border border-slate-100 text-center">
                        <div className="relative group cursor-pointer mb-4" onClick={() => userFileRef.current?.click()}>
                            <div className="h-24 w-24 rounded-full bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl font-bold text-slate-400">{name?.[0]}</div>}
                                {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full border-4 border-white shadow-sm"><Camera className="w-3.5 h-3.5" /></div>
                            <input type="file" ref={userFileRef} hidden accept="image/*" onChange={handleUserImageUpload} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{name || "User"}</h2>
                        <p className="text-xs text-slate-400 font-medium mb-3">{user.email}</p>
                        <Badge variant="secondary" className="bg-lime-100 text-lime-700 hover:bg-lime-100 border-none font-medium">Member since {joinedDate.split(' ')[2]}</Badge>
                    </div>

                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-medium" />
                        </div>
                        <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">Save Changes</Button>
                    </div>

                    <Button variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 h-12 rounded-xl text-sm font-bold" onClick={async () => { triggerHaptic(ImpactStyle.Medium); await supabase.auth.signOut(); window.location.reload(); }}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </TabsContent>

                {/* --- 3. HOUSEHOLD TAB (Consistent) --- */}
                <TabsContent value="household" className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        {/* Name */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><Home className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Name</p><p className="text-xs text-slate-500">{household.name}</p></div>
                            </div>
                            {amIAdmin && <div className="relative cursor-pointer" onClick={() => householdFileRef.current?.click()}><Pencil className="w-4 h-4 text-slate-300" /><input type="file" ref={householdFileRef} hidden accept="image/*" onChange={handleHouseholdImageUpload} /></div>}
                        </div>

                        {/* Selectors */}
                        <CurrencySelector value={hhForm.currency} onSelect={c => setHhForm({ ...hhForm, currency: c })} disabled={!amIAdmin} />
                        <CountrySelector value={hhForm.country} onSelect={c => setHhForm({ ...hhForm, country: c })} disabled={!amIAdmin} />

                        {amIAdmin && (
                            <div className="p-3 bg-slate-50/50">
                                <Button onClick={handleSaveHousehold} disabled={loading} size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">Update Details</Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Members</h3>
                            {amIAdmin && <button onClick={handleCopyInvite} className="text-xs font-bold text-lime-600 flex items-center gap-1"><Share2 className="w-3 h-3" /> Invite</button>}
                        </div>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {members.map((m) => (
                                <div key={m.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">{m.name?.[0]}</div>
                                        <div><p className="text-sm font-bold text-slate-800">{m.name}</p><p className="text-[10px] text-slate-400">{m.is_owner ? 'Admin' : 'Member'}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.is_owner && <Shield className="w-4 h-4 text-lime-500 fill-lime-100" />}
                                        {amIAdmin && m.id !== user.id && (
                                            <button onClick={() => setRemoveMemberId(m.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-full"><UserMinus className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Danger Zone</h3>
                        <div className="bg-rose-50/50 rounded-3xl border border-rose-100 overflow-hidden divide-y divide-rose-100">
                            <button onClick={() => triggerVerification('leave')} className="w-full p-4 flex items-center justify-between hover:bg-rose-100/50 transition-colors text-left">
                                <div><p className="text-sm font-bold text-rose-700">Leave Household</p><p className="text-xs text-rose-500">Sign out of this space.</p></div>
                                <LogOut className="w-5 h-5 text-rose-400" />
                            </button>
                            {amIAdmin && (
                                <button onClick={() => triggerVerification('delete')} className="w-full p-4 flex items-center justify-between hover:bg-rose-100/50 transition-colors text-left">
                                    <div><p className="text-sm font-bold text-rose-700">Delete Household</p><p className="text-xs text-rose-500">Permanently remove all data.</p></div>
                                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* --- 4. APP TAB (Consistent) --- */}
                <TabsContent value="app" className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        {/* Dark Mode */}
                        <div className="p-4 flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500"><Moon className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Dark Mode</p><p className="text-xs text-slate-500">Coming Soon</p></div>
                            </div>
                            <Switch disabled checked={false} />
                        </div>
                        {/* Cache */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500"><CloudOff className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Offline Data</p><p className="text-xs text-slate-500">{cacheSize}</p></div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={handleClearCache} className="text-xs h-8 font-bold text-slate-600">Clear</Button>
                        </div>
                    </div>

                    {/* Share Button (Lime) */}
                    <button
                        onClick={handleShareApp}
                        className="w-full p-4 rounded-3xl shadow-lg shadow-lime-100 bg-lime-500 text-slate-900 flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/30 rounded-xl backdrop-blur-sm"><Share2 className="w-5 h-5" /></div>
                            <div className="text-left">
                                <span className="block text-sm font-bold">Share App</span>
                                <span className="block text-[10px] opacity-70 font-medium">Invite friends to ListNer</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Support Links */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        {/* Rating */}
                        <div className="p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><Star className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Rate Us</p><p className="text-xs text-slate-500">Love the app?</p></div>
                            </div>
                            <div className="flex justify-between px-2 pt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className={`w-8 h-8 cursor-pointer transition-all ${star <= rating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`} onClick={() => handleRateApp(star)} />
                                ))}
                            </div>
                        </div>

                        <a href="https://listner.site" target="_blank" rel="noreferrer" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600"><Globe className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Visit Website</p><p className="text-xs text-slate-500">Listner.site</p></div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </a>

                        <a href="mailto:aliyuiliyasu15@hotmail.com?subject=ListNer%20Support" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><MessageCircle className="w-5 h-5" /></div>
                                <div><p className="text-sm font-bold text-slate-800">Contact Support</p><p className="text-xs text-slate-500">Get help</p></div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </a>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-6 pb-2">
                        <p className="text-xs font-bold text-slate-400">© 2025 ListNer Inc.</p>
                        <p className="text-[10px] text-slate-300 font-mono mt-1">Version {appVersion}</p>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <Dialog open={verifyOpen} onOpenChange={(o) => !o && setVerifyOpen(false)}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> Confirm Action</DialogTitle><DialogDescription>Type <strong>{verifyType === 'leave' ? 'LEAVE' : household.name}</strong> to confirm.</DialogDescription></DialogHeader><Input value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} placeholder="Type here..." className="border-rose-200 focus:ring-rose-500" /><DialogFooter><Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleVerifiedAction} disabled={loading || (verifyType === 'leave' ? verifyInput !== 'LEAVE' : verifyInput !== household.name)}>{loading ? "Processing..." : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={!!removeMemberId} onOpenChange={(o) => !o && setRemoveMemberId(null)}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Remove Member?</DialogTitle><DialogDescription>Are you sure? They will lose access to all shared lists and finance data. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setRemoveMemberId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmRemoveMember}>Remove</Button></DialogFooter></DialogContent></Dialog>
        </div>
    )
}