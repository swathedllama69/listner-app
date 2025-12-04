"use client"

import React, { useState, useRef, useEffect } from "react"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Switch } from "@/components/ui/switch"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Separator } from "@/components/ui/separator"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Badge } from "@/components/ui/badge"
import {
    Camera, LogOut, Loader2, UserMinus, Shield, AlertTriangle, Home,
    User as UserIcon, Smartphone, Moon, Mail, Key,
    HelpCircle, Users, CloudOff, RefreshCw, Star, Share2, Lock, Check, X, Plane
} from "lucide-react"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// --- INLINE UI COMPONENT MOCKS (To allow compilation without external libs) ---

const Card = ({ className, children }: any) => <div className={`bg-white rounded-xl border shadow-sm ${className || ''}`}>{children}</div>;
const CardHeader = ({ className, children }: any) => <div className={`p-6 pb-2 ${className || ''}`}>{children}</div>;
const CardTitle = ({ className, children }: any) => <h3 className={`font-semibold leading-none tracking-tight ${className || ''}`}>{children}</h3>;
const CardDescription = ({ className, children }: any) => <p className={`text-sm text-slate-500 ${className || ''}`}>{children}</p>;
const CardContent = ({ className, children }: any) => <div className={`p-6 pt-0 ${className || ''}`}>{children}</div>;

const Button = ({ className, variant, size, children, ...props }: any) => (
    <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white shadow hover:bg-slate-900/90 h-9 px-4 py-2 ${className || ''}`} {...props}>
        {children}
    </button>
);

const Input = React.forwardRef(({ className, type, ...props }: any, ref: any) => (
    <input
        type={type}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        ref={ref}
        {...props}
    />
));
Input.displayName = "Input";

const Label = ({ className, children, ...props }: any) => <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`} {...props}>{children}</label>;

const Switch = ({ className, ...props }: any) => <input type="checkbox" className={`peer h-[24px] w-[44px] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input ${className || ''}`} {...props} />;

const Select = ({ value, onValueChange, children }: any) => <div>{children}</div>;
const SelectTrigger = ({ className, children, onClick }: any) => <div onClick={onClick} className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}>{children}</div>;
const SelectValue = ({ children }: any) => <span>{children}</span>;
const SelectContent = ({ className, children }: any) => <div className={`hidden ${className || ''}`}>{children}</div>;
const SelectItem = ({ className, children, ...props }: any) => <div className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className || ''}`} {...props}>{children}</div>;

const Separator = ({ className }: any) => <div className={`shrink-0 bg-slate-200 h-[1px] w-full ${className || ''}`} />;

const Badge = ({ className, variant, children }: any) => <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-slate-900 text-white shadow hover:bg-slate-900/80 ${className || ''}`}>{children}</div>;

const TabsContext = React.createContext<any>(null);
const Tabs = ({ value, defaultValue, onValueChange, children, className }: any) => {
    const [active, setActive] = useState(value || defaultValue);
    return (
        <TabsContext.Provider value={{ active, setActive: onValueChange || setActive }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
};
const TabsList = ({ className, children }: any) => <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500 ${className || ''}`}>{children}</div>;
const TabsTrigger = ({ value, className, children, onClick }: any) => {
    const { active, setActive } = React.useContext(TabsContext);
    return (
        <button
            onClick={(e: any) => { setActive(value); if (onClick) onClick(e); }}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${active === value ? 'bg-white text-black shadow' : ''} ${className || ''}`}
        >
            {children}
        </button>
    );
};
const TabsContent = ({ value, className, children }: any) => {
    const { active } = React.useContext(TabsContext);
    if (active !== value) return null;
    return <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`}>{children}</div>;
};

const Dialog = ({ open, onOpenChange, children }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            {children}
        </div>
    );
};
const DialogContent = ({ className, children }: any) => <div className={`bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative ${className || ''}`}>{children}</div>;
const DialogHeader = ({ className, children }: any) => <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ''}`}>{children}</div>;
const DialogTitle = ({ className, children }: any) => <h2 className={`text-lg font-semibold leading-none tracking-tight ${className || ''}`}>{children}</h2>;
const DialogDescription = ({ className, children }: any) => <p className={`text-sm text-slate-500 ${className || ''}`}>{children}</p>;
const DialogFooter = ({ className, children }: any) => <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ''}`}>{children}</div>;

// --- MOCK DEPENDENCIES (To allow compilation without external libs) ---

// 1. Types
interface User {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata: {
        full_name?: string;
        avatar_url?: string;
    };
    app_metadata: {
        provider?: string;
    };
}

interface Household {
    id: string;
    name: string;
    country?: string;
    currency?: string;
    invite_code?: string;
    avatar_url?: string;
}

// 2. Constants
const COUNTRIES = ["Nigeria", "United States", "United Kingdom", "Canada", "Ghana", "South Africa", "Kenya"];
const CURRENCIES = [
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R", name: "South African Rand" }
];

// 3. Mock Capacitor & Native Features
const Capacitor = {
    isNativePlatform: () => false
};

const CapApp = {
    getInfo: async () => ({ version: "1.0.0", build: "100" })
};

const Share = {
    share: async (options: any) => console.log("Shared:", options)
};

enum ImpactStyle { Light = 'LIGHT', Medium = 'MEDIUM', Heavy = 'HEAVY' }
enum NotificationType { Success = 'SUCCESS', Warning = 'WARNING', Error = 'ERROR' }

const Haptics = {
    impact: async (options: { style: ImpactStyle }) => console.log("Haptic Impact:", options.style),
    notification: async (options: { type: NotificationType }) => console.log("Haptic Notification:", options.type)
};

// 4. Mock Supabase Client
const mockReturn = { data: null, error: null as { message: string } | null };
const createMockChain = () => {
    const chain: any = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: { rating: 5 }, error: null as { message: string } | null }),
        update: () => chain,
        delete: () => chain,
        upsert: async () => mockReturn,
        // Make the chain 'thenable' so it works with await
        then: (onfulfilled: any) => Promise.resolve(mockReturn).then(onfulfilled)
    };
    return chain;
};

const supabase = {
    auth: {
        updateUser: async (data: any) => Promise.resolve({ error: null as { message: string } | null }),
        signOut: async () => Promise.resolve({ error: null as { message: string } | null })
    },
    from: (table: string) => createMockChain(),
    rpc: (func: string, params: any) => {
        if (func === 'get_household_members_safe') {
            return Promise.resolve({
                data: [
                    { user_id: '1', email: 'me@example.com', full_name: 'Me', is_owner: true },
                    { user_id: '2', email: 'member@example.com', full_name: 'Member', is_owner: false }
                ],
                error: null
            });
        }
        return Promise.resolve({ data: null, error: null });
    },
    storage: {
        from: (bucket: string) => ({
            upload: async (path: string, file: any) => ({ error: null as { message: string } | null }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: "https://via.placeholder.com/150" } })
        })
    }
};

// 5. Mock Offline Lib
const clearCache = async () => console.log("Cache cleared");
const getCacheSize = async () => "1.2 MB";

// --- END MOCKS ---

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

// ⚡ GRID CURRENCY SELECTOR COMPONENT
function CurrencySelector({ value, onSelect, disabled }: { value: string, onSelect: (c: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCurrency = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div onClick={() => !disabled && setIsOpen(true)} className={`flex items-center justify-between p-3 border rounded-xl bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {selectedCurrency.symbol}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{selectedCurrency.code}</p>
                        <p className="text-xs text-slate-500">{selectedCurrency.name}</p>
                    </div>
                </div>
                {!disabled && <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Change</div>}
            </div>

            <DialogContent className="max-w-sm rounded-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Currency</DialogTitle>
                    <DialogDescription>Choose your primary household currency.</DialogDescription>
                </DialogHeader>
                {/* Scrollable Grid of Currency Options */}
                <div className="flex-1 overflow-y-auto p-1 grid grid-cols-2 gap-2">
                    {CURRENCIES.map(c => (
                        <button
                            key={c.code}
                            onClick={() => { onSelect(c.code); setIsOpen(false); }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${value === c.code ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <span className="text-xl font-bold text-slate-800">{c.symbol}</span>
                            <span className="text-xs font-bold text-slate-600">{c.code}</span>
                            <span className="text-[9px] text-slate-400 text-center leading-tight">{c.name}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ⚡ COUNTRY SELECTOR COMPONENT
function CountrySelector({ value, onSelect, disabled }: { value: string, onSelect: (c: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedCountry = value || COUNTRIES[0];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div onClick={() => !disabled && setIsOpen(true)} className={`flex items-center justify-between p-3 border rounded-xl bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                        <Plane className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{selectedCountry}</p>
                        <p className="text-xs text-slate-500">Selected Region</p>
                    </div>
                </div>
                {!disabled && <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Change</div>}
            </div>

            <DialogContent className="max-w-sm rounded-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Country</DialogTitle>
                    <DialogDescription>Choose your household's primary country/region.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-1 grid grid-cols-2 gap-2">
                    {COUNTRIES.map(c => (
                        <button
                            key={c}
                            onClick={() => { onSelect(c); setIsOpen(false); }}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${value === c ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <span className="text-sm font-bold text-slate-800">{c}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}


export function SettingsView({ user = { id: '1', email: 'test@example.com', user_metadata: { full_name: 'Test User' }, app_metadata: { provider: 'email' } }, household = { id: '1', name: 'My Household', invite_code: 'ABC1234' }, onSettingsChange = () => { } }: { user: User, household: Household & { invite_code?: string }, onSettingsChange: () => void }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [verifyType, setVerifyType] = useState<'leave' | 'delete'>('leave');
    const [verifyInput, setVerifyInput] = useState("");
    const [appVersion, setAppVersion] = useState("Web");
    const [cacheSize, setCacheSize] = useState("0 KB");

    const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, desc: string }>({ isOpen: false, title: '', desc: '' });
    const showAlert = (title: string, desc: string) => setAlertInfo({ isOpen: true, title, desc });

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

    const handleUserImageUpload = async (e: any) => {
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
            showAlert("Success", "Profile photo updated!");
        } catch (err: any) { showAlert("Error", err.message); } finally { setUploading(false); }
    };

    const handleHouseholdImageUpload = async (e: any) => {
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
            showAlert("Success", "Household icon updated!");
        } catch (err: any) { showAlert("Error", err.message); } finally { setUploading(false); }
    };

    const handleSaveProfile = async () => {
        setLoading(true); triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
        setLoading(false);
        if (error) showAlert("Error", error.message);
        else { triggerNotificationHaptic(NotificationType.Success); onSettingsChange(); showAlert("Updated", "Profile name updated."); }
    }

    const handleSaveHousehold = async () => {
        if (!amIAdmin) return;
        setLoading(true); triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.from('households').update({ name: hhForm.name, country: hhForm.country, currency: hhForm.currency }).eq('id', household.id);
        setLoading(false);
        if (error) showAlert("Error", error.message);
        else { triggerNotificationHaptic(NotificationType.Success); onSettingsChange(); showAlert("Updated", "Household details updated."); }
    }

    const handleCopyInvite = async () => {
        const inviteLink = `https://listner.app/join/${household.invite_code}`;
        if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Join my Household on ListNer', text: `Join my household using this code: ${household.invite_code} or click: `, url: inviteLink }); }
        else { await navigator.clipboard.writeText(inviteLink); showAlert("Copied", "Invite link copied to clipboard."); }
    }

    const triggerVerification = (type: 'leave' | 'delete') => {
        triggerHaptic(ImpactStyle.Medium);
        if (type === 'leave' && amIAdmin && members.length === 1) { setVerifyType('delete'); setVerifyOpen(true); return; }
        if (type === 'leave' && amIAdmin && members.length > 1) return showAlert("Action Blocked", "Owner cannot leave. Transfer ownership or delete household.");
        setVerifyType(type); setVerifyInput(""); setVerifyOpen(true);
    }

    const handleVerifiedAction = async () => {
        const requiredText = verifyType === 'leave' ? 'LEAVE' : household.name;
        if (verifyInput !== requiredText) return showAlert("Error", "Verification failed. Check spelling.");
        setLoading(true); triggerHaptic(ImpactStyle.Heavy);
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
        if (!removeMemberId) return; triggerHaptic(ImpactStyle.Medium);
        const { error } = await supabase.from('household_members').delete().eq('user_id', removeMemberId).eq('household_id', household.id);
        setRemoveMemberId(null);
        if (!error) { setMembers(members.filter(m => m.id !== removeMemberId)); triggerNotificationHaptic(NotificationType.Success); showAlert("Removed", "Member has been removed."); }
        else { showAlert("Error", error.message); }
    }

    const handleClearCache = async () => { triggerHaptic(ImpactStyle.Medium); await clearCache(); setCacheSize("0 KB"); showAlert("Success", "Offline cache cleared."); }
    const handleRateApp = async (stars: number) => { setRating(stars); triggerHaptic(ImpactStyle.Medium); const { error } = await supabase.from('app_ratings').upsert({ user_id: user.id, rating: stars, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (!error) showAlert("Thank You!", "Your rating has been saved."); }
    const handleShareApp = async () => { triggerHaptic(ImpactStyle.Medium); const url = 'https://listner.site/'; const msg = 'Check out ListNer - The best app for household lists and finance tracking!'; try { if (Capacitor.isNativePlatform()) { await Share.share({ title: 'Share ListNer', text: msg, url: url, dialogTitle: 'Share with friends', }); } else if (navigator.share) { await navigator.share({ title: 'ListNer', text: msg, url }); } else { await navigator.clipboard.writeText(`${msg} ${url}`); showAlert("Copied", "Link copied to clipboard!"); } } catch (error) { console.error("Share failed:", error); } }

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
                            <Badge variant="secondary" className="mt-2 text-[10px] font-normal bg-slate-100 text-slate-500">Joined {joinedDate}</Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2"><Label>Display Name</Label><Input value={name} onChange={(e: any) => setName(e.target.value)} className="bg-white h-12 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Account Type</Label><div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"><div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{isEmail ? <Mail className="w-5 h-5 text-slate-600" /> : <Key className="w-5 h-5 text-orange-500" />}</div><div><p className="text-sm font-bold text-slate-800 capitalize">{provider} Account</p><p className="text-xs text-slate-400">Managed by Supabase Auth</p></div></div></div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base shadow-lg shadow-indigo-100 rounded-xl font-bold">{loading ? "Saving..." : "Save Changes"}</Button>
                    <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl" onClick={async () => { triggerHaptic(ImpactStyle.Medium); await supabase.auth.signOut(); window.location.reload(); }}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
                </TabsContent>

                <TabsContent value="household" className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
                        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/50 pb-4"><CardTitle className="text-emerald-800 flex items-center gap-2"><Home className="w-5 h-5" /> Household Details</CardTitle><CardDescription>Manage your shared space.</CardDescription></CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-5">
                                <div className={`relative ${amIAdmin ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} onClick={() => amIAdmin && householdFileRef.current?.click()}>
                                    <div className="h-20 w-20 rounded-2xl bg-white border-2 border-emerald-100 shadow-sm overflow-hidden flex items-center justify-center">
                                        {hhForm.avatar_url ? <img src={hhForm.avatar_url} className="w-full h-full object-cover" alt="Household Icon" /> : <Home className="w-8 h-8 text-emerald-200" />}
                                    </div>
                                    {amIAdmin && <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm"><Camera className="w-3 h-3" /></div>}
                                    <input type="file" ref={householdFileRef} hidden accept="image/*" onChange={handleHouseholdImageUpload} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-lg">Icon & Name</h3>
                                    <p className="text-xs text-slate-500">{amIAdmin ? "Update image & name." : "View only."}</p>
                                    <Input value={hhForm.name} onChange={(e: any) => setHhForm({ ...hhForm, name: e.target.value })} disabled={!amIAdmin} className="focus:ring-emerald-500 rounded-xl mt-2" />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <CurrencySelector value={hhForm.currency} onSelect={c => setHhForm({ ...hhForm, currency: c })} disabled={!amIAdmin} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Country/Region</Label>
                                    <CountrySelector value={hhForm.country} onSelect={c => setHhForm({ ...hhForm, country: c })} disabled={!amIAdmin} />
                                </div>
                            </div>

                            {amIAdmin && <div className="flex justify-end pt-2"><Button onClick={handleSaveHousehold} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 rounded-xl">Update Household</Button></div>}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-slate-500" /> Members</CardTitle>{amIAdmin && <Button size="sm" variant="outline" onClick={handleCopyInvite} className="gap-2 h-8 rounded-lg text-xs"><Share2 className="w-3 h-3" /> Invite</Button>}</CardHeader>
                        <CardContent className="space-y-3">
                            {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 border rounded-xl bg-white hover:bg-slate-50 transition-colors"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{m.name?.[0]}</div><div><p className="text-sm font-bold text-slate-800">{m.name} {m.id === user.id && "(You)"}</p><p className="text-xs text-slate-500">{m.email}</p></div></div><div className="flex items-center gap-2">{m.is_owner ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Shield className="w-3 h-3" /> Owner</span> : <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">Member</span>}{amIAdmin && m.id !== user.id && <Button variant="ghost" size="sm" onClick={() => setRemoveMemberId(m.id)} className="h-8 w-8 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"><UserMinus className="w-4 h-4" /></Button>}</div></div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="mt-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Danger Zone</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => triggerVerification('leave')} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl text-left hover:bg-rose-100 transition-colors group">
                                <div>
                                    <p className="text-sm font-bold text-rose-700">Leave Household</p>
                                    <p className="text-xs text-rose-600/70 mt-0.5">Remove yourself from this shared space.</p>
                                </div>
                                <LogOut className="w-5 h-5 text-rose-400 group-hover:text-rose-600" />
                            </button>

                            {amIAdmin && (
                                <button onClick={() => triggerVerification('delete')} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-left hover:bg-slate-100 transition-colors group">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Delete Household</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Permanently delete this space and all data.</p>
                                    </div>
                                    <AlertTriangle className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                                </button>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="app" className="space-y-6">
                    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle>Preferences</CardTitle></CardHeader><CardContent className="space-y-6"><div className="flex items-center justify-between"><div className="flex gap-3"><div className="p-2 bg-amber-50 rounded-lg"><CloudOff className="w-5 h-5 text-amber-600" /></div><div><p className="font-medium text-sm">Offline Data</p><p className="text-xs text-slate-500">Cache Size: {cacheSize}</p></div></div><Button variant="outline" size="sm" onClick={handleClearCache}><RefreshCw className="w-3 h-3 mr-2" /> Clear</Button></div><Separator /><div className="flex flex-col items-center py-2 gap-2"><p className="text-sm font-bold text-slate-700">Rate ListNer</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`w-8 h-8 cursor-pointer transition-all ${star <= rating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`} onClick={() => handleRateApp(star)} />))}</div></div><Separator /><div className="flex items-center justify-between cursor-pointer" onClick={handleShareApp}><div className="flex gap-3"><div className="p-2 bg-blue-50 rounded-lg"><Share2 className="w-5 h-5 text-blue-600" /></div><div><p className="font-medium text-sm">Share App</p><p className="text-xs text-slate-500">Invite friends to ListNer</p></div></div><Button variant="ghost" size="sm">Share</Button></div><Separator /><div className="flex items-center justify-between opacity-60"><div className="flex gap-3"><div className="p-2 bg-slate-100 rounded-lg"><Moon className="w-5 h-5 text-slate-600" /></div><div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-slate-500">Coming Soon</p></div></div><Switch disabled /></div><Separator /><div className="flex items-center justify-between cursor-pointer" onClick={() => window.open('mailto:aliyuiliyasu15@hotmail.com?subject=ListNer%20Support', '_blank')}><div className="flex gap-3"><div className="p-2 bg-indigo-50 rounded-lg"><HelpCircle className="w-5 h-5 text-indigo-600" /></div><div><p className="font-medium text-sm">Contact Support</p><p className="text-xs text-slate-500">Having trouble? Email us.</p></div></div><Button variant="ghost" size="sm">Email</Button></div><Separator /><div className="text-center pt-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ListNer {appVersion}</p><p className="text--[10px] text-slate-300 mt-1">© 2025 ListNer Inc.</p></div></CardContent></Card>
                </TabsContent>
            </Tabs>

            <Dialog open={verifyOpen} onOpenChange={(o: any) => !o && setVerifyOpen(false)}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> Confirm Action</DialogTitle><DialogDescription>Type <strong>{verifyType === 'leave' ? 'LEAVE' : household.name}</strong> to confirm.</DialogDescription></DialogHeader><Input value={verifyInput} onChange={(e: any) => setVerifyInput(e.target.value)} placeholder="Type here..." className="border-rose-200 focus:ring-rose-500" /><DialogFooter><Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleVerifiedAction} disabled={loading || (verifyType === 'leave' ? verifyInput !== 'LEAVE' : verifyInput !== household.name)}>{loading ? "Processing..." : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>

            <Dialog open={!!removeMemberId} onOpenChange={(o: any) => !o && setRemoveMemberId(null)}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Remove Member?</DialogTitle><DialogDescription>Are you sure? They will lose access to all shared lists and finance data. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setRemoveMemberId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmRemoveMember}>Remove</Button></DialogFooter></DialogContent></Dialog>

            <AlertDialog isOpen={alertInfo.isOpen} onOpenChange={(o: any) => setAlertInfo({ ...alertInfo, isOpen: o })} title={alertInfo.title} description={alertInfo.desc} />
        </div>
    )
}