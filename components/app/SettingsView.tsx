"use client"

import React, { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Household } from "@/lib/types"

// UI Imports (Assuming you have these, otherwise use the inline mocks from before)
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
    User as UserIcon, Smartphone, Moon, Mail, Key,
    HelpCircle, Users, CloudOff, RefreshCw, Star, Share2, Lock, Check, X,
    ChevronRight, Globe, MessageCircle, CreditCard, MapPin, Bell
} from "lucide-react"
import { COUNTRIES, CURRENCIES } from "@/lib/constants"
import { Capacitor } from "@capacitor/core"
import { App as CapApp } from "@capacitor/app"
import { Share } from '@capacitor/share'
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
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
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
                            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${value === c.code ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}
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
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
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
                            className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${value === c ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
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
    const [darkMode, setDarkMode] = useState(false); // Placeholder state for dark mode

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
        if (Capacitor.isNativePlatform()) { try { await Haptics.impact({ style }); } catch (e) { } }
    };

    const triggerNotificationHaptic = async (type: NotificationType) => {
        if (Capacitor.isNativePlatform()) { try { await Haptics.notification({ type }); } catch (e) { } }
    }

    const amIAdmin = members.length > 0 ? (members.find(m => m.id === user.id)?.is_owner ?? false) : true;

    // --- ACTIONS ---
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

    // ⚡ BEAUTIFIED SHARE BUTTON
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

    const provider = user.app_metadata.provider || 'email';
    const isEmail = provider === 'email';

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Tabs defaultValue="profile" className="w-full">

                {/* --- 1. NEW TAB HEADER --- */}
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80 p-1.5 rounded-2xl h-14 shadow-inner">
                    <TabsTrigger value="profile" onClick={() => triggerHaptic()} className="h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-xs"><UserIcon className="w-4 h-4 mr-2" /> Profile</TabsTrigger>
                    <TabsTrigger value="household" onClick={() => triggerHaptic()} className="h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm font-bold text-xs"><Home className="w-4 h-4 mr-2" /> Household</TabsTrigger>
                    <TabsTrigger value="app" onClick={() => triggerHaptic()} className="h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-bold text-xs"><Smartphone className="w-4 h-4 mr-2" /> App</TabsTrigger>
                </TabsList>

                {/* --- 2. PROFILE TAB --- */}
                <TabsContent value="profile" className="space-y-6">
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                        <div className="bg-indigo-50/50 p-6 flex flex-col items-center border-b border-indigo-50">
                            <div className="relative group cursor-pointer mb-4" onClick={() => userFileRef.current?.click()}>
                                <div className="h-24 w-24 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-3xl font-bold text-indigo-400">{name?.[0]}</div>}
                                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                                </div>
                                <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full border-2 border-white shadow-sm"><Camera className="w-4 h-4" /></div>
                                <input type="file" ref={userFileRef} hidden accept="image/*" onChange={handleUserImageUpload} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{name || "User"}</h2>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            <Badge variant="secondary" className="mt-2 bg-white text-slate-500 border-slate-200">Joined {joinedDate}</Badge>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all" />
                            </div>
                            <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200">Save Changes</Button>
                        </div>
                    </Card>

                    <Button variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 h-12 rounded-xl" onClick={async () => { triggerHaptic(ImpactStyle.Medium); await supabase.auth.signOut(); window.location.reload(); }}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </TabsContent>

                {/* --- 3. HOUSEHOLD TAB --- */}
                <TabsContent value="household" className="space-y-6">
                    {/* General Settings Card */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">General</h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {/* Icon & Name */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="relative cursor-pointer flex-shrink-0" onClick={() => amIAdmin && householdFileRef.current?.click()}>
                                    <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                                        {hhForm.avatar_url ? <img src={hhForm.avatar_url} className="w-full h-full object-cover" /> : <Home className="w-6 h-6 text-slate-300" />}
                                    </div>
                                    {amIAdmin && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border border-white"><Camera className="w-3 h-3" /></div>}
                                    <input type="file" ref={householdFileRef} hidden accept="image/*" onChange={handleHouseholdImageUpload} />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs text-slate-400 uppercase">Household Name</Label>
                                    <Input value={hhForm.name} onChange={e => setHhForm({ ...hhForm, name: e.target.value })} disabled={!amIAdmin} className="h-9 mt-1 bg-transparent border-none shadow-none p-0 text-lg font-bold text-slate-800 focus-visible:ring-0 placeholder:text-slate-300" placeholder="My Home" />
                                </div>
                            </div>

                            {/* Selectors */}
                            <CurrencySelector value={hhForm.currency} onSelect={c => setHhForm({ ...hhForm, currency: c })} disabled={!amIAdmin} />
                            <CountrySelector value={hhForm.country} onSelect={c => setHhForm({ ...hhForm, country: c })} disabled={!amIAdmin} />

                            {/* Save Button (Only if Admin) */}
                            {amIAdmin && (
                                <div className="p-3 bg-slate-50/50">
                                    <Button onClick={handleSaveHousehold} disabled={loading} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">Save Household Settings</Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Members Card */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Members</h3>
                            {amIAdmin && <button onClick={handleCopyInvite} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Share2 className="w-3 h-3" /> Invite</button>}
                        </div>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {members.map((m) => (
                                <div key={m.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">{m.name?.[0]}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{m.name} {m.id === user.id && "(You)"}</p>
                                            <p className="text-xs text-slate-400">{m.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.is_owner ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100">Owner</Badge> : <Badge variant="secondary" className="bg-slate-100 text-slate-500">Member</Badge>}
                                        {amIAdmin && m.id !== user.id && (
                                            <button onClick={() => setRemoveMemberId(m.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-full"><UserMinus className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
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

                {/* --- 4. APP TAB (Beautified) --- */}
                <TabsContent value="app" className="space-y-6">

                    {/* Preferences */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Preferences</h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Moon className="w-5 h-5" /></div><span className="text-sm font-bold text-slate-700">Dark Mode</span></div>
                                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Bell className="w-5 h-5" /></div><span className="text-sm font-bold text-slate-700">Notifications</span></div>
                                <Switch defaultChecked />
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><CloudOff className="w-5 h-5" /></div><div><p className="text-sm font-bold text-slate-700">Offline Cache</p><p className="text-xs text-slate-400">{cacheSize}</p></div></div>
                                <Button size="sm" variant="ghost" onClick={handleClearCache} className="text-xs h-8">Clear</Button>
                            </div>
                        </div>
                    </div>

                    {/* Colorful Share Button */}
                    <button
                        onClick={handleShareApp}
                        className="w-full p-4 rounded-3xl shadow-lg shadow-indigo-200 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Share2 className="w-6 h-6 text-white" /></div>
                            <div className="text-left">
                                <span className="block text-lg font-bold">Share App</span>
                                <span className="block text-xs opacity-90 font-medium">Invite friends to ListNer</span>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Support & Links */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Support</h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {/* Rating */}
                            <div className="p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-3"><div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><Star className="w-5 h-5" /></div><span className="text-sm font-bold text-slate-700">Rate Us</span></div>
                                <div className="flex justify-between px-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} className={`w-8 h-8 cursor-pointer transition-all ${star <= rating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`} onClick={() => handleRateApp(star)} />
                                    ))}
                                </div>
                            </div>

                            <a href="https://listner.site" target="_blank" rel="noreferrer" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3"><div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><Globe className="w-5 h-5" /></div><span className="text-sm font-bold text-slate-700">Visit Website</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Listner.site</span><ChevronRight className="w-4 h-4 text-slate-300" /></div>
                            </a>

                            <a href="mailto:aliyuiliyasu15@hotmail.com?subject=ListNer%20Support" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><MessageCircle className="w-5 h-5" /></div><span className="text-sm font-bold text-slate-700">Contact Support</span></div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </a>
                        </div>
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