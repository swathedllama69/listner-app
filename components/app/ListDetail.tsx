"use client"

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react"
import { createPortal } from "react-dom"
// import { supabase } from "@/lib/supabase" 
// import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
// import { List, WishlistItem } from "@/lib/types"
import { Trash2, Link as LinkIcon, DollarSign, Plus, Pencil, Settings, Globe, Lock, ListChecks, MoreHorizontal, ChevronDown, ChevronUp, CloudOff, Target, Goal, Gem, Plane } from "lucide-react"
// import { CACHE_KEYS, saveToCache, loadFromCache } from "@/lib/offline" 
// import { SyncQueue } from "@/lib/syncQueue"
// import { Capacitor } from "@capacitor/core" 
// import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics" 

// --- INLINE MOCKS & TYPES (To fix build errors) ---

interface User { id: string; }
interface List { id: string; name: string; household_id: string; is_private: boolean; }
interface WishlistItem {
    id: number;
    name: string;
    description?: string;
    category: string;
    target_amount: number | null;
    saved_amount: number | null;
    quantity: number | null;
    link?: string;
    priority?: string;
    is_complete: boolean;
    created_at: string;
    user_id: string;
}

const CACHE_KEYS = { WISHLIST: (id: string) => `wishlist-${id}` };
const saveToCache = (key: string, data: any) => { };
const loadFromCache = <T,>(key: string): T | null => null;

const SyncQueue = { add: (data: any) => console.log("Added to offline queue:", data) };

const Capacitor = { isNativePlatform: () => false };

enum ImpactStyle { Light = 'Light', Medium = 'Medium' }
enum NotificationType { Success = 'Success', Error = 'Error' }
const Haptics = {
    impact: async (opts: any) => { },
    notification: async (opts: any) => { }
};

// ⚡ FIXED MOCK: Uses standard Promise for await compatibility + Object.assign for chaining
const supabase = {
    from: (table: string) => ({
        select: (cols: string) => ({
            eq: (col: string, val: any) => ({
                order: (col2: string, opts: any) => Promise.resolve({ data: [], error: null })
            })
        }),
        insert: (data: any) => ({
            select: () => ({
                single: () => Promise.resolve({ data: { ...data, id: Date.now() }, error: null })
            })
        }),
        update: (data: any) => ({
            eq: (col: string, val: any) => {
                // Create a standard Promise that resolves to the mock result
                const promise = Promise.resolve({ data: [data], error: null });

                // Attach the .select() method to the Promise instance to allow chaining
                return Object.assign(promise, {
                    select: () => ({
                        single: () => Promise.resolve({ data: { ...data }, error: null })
                    })
                });
            }
        }),
        delete: () => ({
            eq: (col: string, val: any) => Promise.resolve({ error: null })
        })
    })
};

// --- END MOCKS ---

const categories = ["Item", "Project", "Vacation", "Other"]
const priorities = ["High", "Medium", "Low"]

// --- HELPER FUNCTIONS ---
const getPriorityCardStyle = (p: string) => {
    switch (p) {
        case 'High': return 'bg-rose-50 border-rose-200';
        case 'Medium': return 'bg-amber-50/50 border-amber-100';
        default: return 'bg-white border-slate-100';
    }
}

const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 70) return "bg-emerald-400";
    if (percent >= 30) return "bg-amber-400";
    return "bg-rose-400";
};

function PortalFAB({ onClick, className, icon: Icon, label }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] flex items-center gap-3 animate-in zoom-in duration-300 pointer-events-none">
            {label && <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto">{label}</span>}
            <Button onClick={onClick} className={`${className} shadow-2xl border-4 border-white/20 active:scale-90 transition-transform pointer-events-auto`}>
                <Icon className="w-8 h-8" />
            </Button>
        </div>,
        document.body
    );
}

const getProgress = (saved: number | null, target: number | null) => {
    if (!saved || !target || target === 0) return 0
    return Math.min((saved / target) * 100, 100)
}

function ConfirmDialog({ isOpen, onOpenChange, title, description, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
                <DialogFooter className="flex gap-2 sm:justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ListDetail({ user, list, currencySymbol }: { user: User, list: List, currencySymbol: string }) {
    const [items, setItems] = useState<WishlistItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("All")
    const [page, setPage] = useState(1);
    const [usingCachedData, setUsingCachedData] = useState(false);
    const ITEMS_PER_PAGE = 5;

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isContributionOpen, setIsContributionOpen] = useState(false)
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, type: 'item' | 'list', id?: number } | null>(null)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    const [form, setForm] = useState({ name: "", description: "", category: "Item", target_amount: "", saved_amount: "", quantity: "1", link: "", priority: "Medium" })
    const [contribForm, setContribForm] = useState({ amount: "", note: "" })
    const [listNameForm, setListNameForm] = useState(list.name)
    const [listSettings, setListSettings] = useState({ name: list.name, isPrivate: list.is_private })

    const [selectedItemForContrib, setSelectedItemForContrib] = useState<WishlistItem | null>(null)
    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)

    const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style });
            } catch (e) { }
        }
    };

    const triggerNotificationHaptic = async (type: NotificationType) => {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.notification({ type });
            } catch (e) { }
        }
    }

    useEffect(() => {
        async function getItems() {
            const cacheKey = CACHE_KEYS.WISHLIST(list.id);
            const cachedData = loadFromCache<WishlistItem[]>(cacheKey);
            if (cachedData) {
                setItems(cachedData);
                setUsingCachedData(true);
                setIsLoading(false);
            } else {
                setIsLoading(true);
            }
            const { data, error } = await supabase.from("wishlist_items").select("*").eq("list_id", list.id).order("created_at", { ascending: false })
            if (!error && data) {
                setItems(data as WishlistItem[]);
                saveToCache(cacheKey, data);
                setUsingCachedData(false);
            }
            setIsLoading(false);
        }
        getItems()
    }, [list.id])

    const activeItems = useMemo(() => {
        const filtered = items.filter(i => !i.is_complete && (activeTab === "All" ? true : i.category === activeTab));
        const priorityWeight: { [key: string]: number } = { "High": 3, "Medium": 2, "Low": 1 };
        return filtered.sort((a, b) => {
            const weightA = priorityWeight[a.priority || "Medium"] || 1;
            const weightB = priorityWeight[b.priority || "Medium"] || 1;
            if (weightA !== weightB) return weightB - weightA;
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
    }, [items, activeTab]);

    const visibleItems = activeItems.slice(0, page * ITEMS_PER_PAGE);
    const hasMore = activeItems.length > visibleItems.length;
    const completedItems = items.filter(i => i.is_complete);
    const totalTarget = activeItems.reduce((sum, i) => sum + (i.target_amount || 0), 0);
    const totalSaved = activeItems.reduce((sum, i) => sum + (i.saved_amount || 0), 0);
    const totalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    const handleRenameList = async () => {
        const { error } = await supabase.from('lists').update({ name: listNameForm }).eq('id', list.id);
        if (!error) {
            setListSettings(prev => ({ ...prev, name: listNameForm }));
            setIsRenameOpen(false);
        }
    }

    const handleAddItem = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        triggerHaptic(ImpactStyle.Medium);

        const target = parseFloat(form.target_amount);
        const saved = parseFloat(form.saved_amount);
        const qty = parseInt(form.quantity);

        const newItemPayload = {
            list_id: list.id,
            user_id: user.id,
            name: form.name,
            description: form.description || null,
            category: form.category,
            target_amount: isNaN(target) ? null : target,
            saved_amount: isNaN(saved) ? 0 : saved,
            quantity: (form.category === "Item") ? qty : null,
            link: form.link || null,
            priority: form.priority
        };

        const executeOfflineSave = () => {
            const tempItem: WishlistItem = {
                id: -Date.now(),
                created_at: new Date().toISOString(),
                is_complete: false,
                ...newItemPayload
            } as any;

            const newItems = [tempItem, ...items];
            setItems(newItems);
            saveToCache(CACHE_KEYS.WISHLIST(list.id), newItems);

            SyncQueue.add({
                type: 'ADD_WISHLIST_ITEM',
                payload: tempItem,
                householdId: list.household_id
            });

            setIsFormOpen(false);
            setForm({ name: "", description: "", category: "Item", target_amount: "", saved_amount: "", quantity: "1", link: "", priority: "Medium" });
            triggerNotificationHaptic(NotificationType.Success);
        };

        if (navigator.onLine) {
            try {
                const { data, error } = await supabase.from('wishlist_items').insert(newItemPayload).select().single();
                if (error) throw error;

                const newItems = [data as WishlistItem, ...items];
                setItems(newItems);
                saveToCache(CACHE_KEYS.WISHLIST(list.id), newItems);
                setIsFormOpen(false);
                setForm({ name: "", description: "", category: "Item", target_amount: "", saved_amount: "", quantity: "1", link: "", priority: "Medium" });
                triggerNotificationHaptic(NotificationType.Success);
            } catch (err) {
                console.warn("Online add failed, falling back to offline queue.", err);
                executeOfflineSave();
            }
        } else {
            executeOfflineSave();
        }
    }

    const handleAddContribution = async (e: FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(contribForm.amount);
        if (!selectedItemForContrib || isNaN(amount)) return;

        triggerHaptic(ImpactStyle.Light);
        const newSaved = (selectedItemForContrib.saved_amount || 0) + amount;

        setItems(items.map(i => i.id === selectedItemForContrib.id ? { ...i, saved_amount: newSaved } : i));
        setIsContributionOpen(false);
        setContribForm({ amount: "", note: "" });

        const { error } = await supabase.from('wishlist_items').update({ saved_amount: newSaved }).eq('id', selectedItemForContrib.id);

        if (error) {
            alert("Failed to add funds.");
        } else {
            triggerNotificationHaptic(NotificationType.Success);
        }
    }

    const handleUpdateItem = async (updatedItem: Partial<WishlistItem>) => {
        if (!editingItem) return;
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...updatedItem } as WishlistItem : i));
        setEditingItem(null);
        const { data, error } = await supabase.from('wishlist_items').update({
            name: updatedItem.name, description: updatedItem.description, category: updatedItem.category, target_amount: updatedItem.target_amount,
            saved_amount: updatedItem.saved_amount,
            quantity: updatedItem.quantity, link: updatedItem.link, priority: updatedItem.priority
        }).eq('id', editingItem.id).select().single();
    };

    const handleTogglePrivacy = async () => {
        const newStatus = !listSettings.isPrivate;
        const { error } = await supabase.from('lists').update({ is_private: newStatus }).eq('id', list.id);
        if (!error) {
            setListSettings({ ...listSettings, isPrivate: newStatus });
            alert(`List is now ${newStatus ? 'Private' : 'Shared'}`);
        }
    }

    const handleDelete = async () => {
        triggerHaptic(ImpactStyle.Medium);
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'item' && deleteConfirm.id) {
            const oldItems = [...items];
            setItems(items.filter(item => item.id !== deleteConfirm.id));
            const { error } = await supabase.from("wishlist_items").delete().eq("id", deleteConfirm.id);
            if (error) setItems(oldItems);
        } else if (deleteConfirm.type === 'list') {
            await supabase.from('lists').delete().eq('id', list.id); window.location.reload();
        }
        setDeleteConfirm(null);
    }

    const toggleComplete = async (item: WishlistItem) => {
        triggerHaptic(ImpactStyle.Light);
        const newStatus = !item.is_complete;
        setItems(items.map(i => i.id === item.id ? { ...i, is_complete: newStatus } : i));
        const { error } = await supabase.from("wishlist_items").update({ is_complete: newStatus }).eq("id", item.id)
        if (error) {
            setItems(items.map(i => i.id === item.id ? { ...i, is_complete: !newStatus } : i));
        }
    }

    return (
        <div className={`space-y-6 pb-24 transition-opacity duration-500 ${usingCachedData ? 'opacity-90 grayscale-[10%]' : ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{list.name}</h2>
                    <div className="flex gap-2 mt-1">
                        {listSettings.isPrivate ? <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100"><Lock className="w-3 h-3" /> Private</span> : <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100"><Globe className="w-3 h-3" /> Shared</span>}
                        {usingCachedData && <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"><CloudOff className="w-3 h-3" /> Offline View</span>}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Settings className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>List Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsRenameOpen(true)}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleTogglePrivacy}>{listSettings.isPrivate ? <Globe className="w-4 h-4 mr-2 text-blue-500" /> : <Lock className="w-4 h-4 mr-2 text-amber-500" />} {listSettings.isPrivate ? "Make Public" : "Make Private"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'list' })}><Trash2 className="w-4 h-4 mr-2" /> Delete List</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-y border-slate-100 px-6 py-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-end"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Progress</span><span className="text-sm font-bold text-purple-700">{Math.round(totalProgress)}%</span></div>
                {/* ⚡ UPDATED: Shrink Progress Bar (h-1.5) */}
                <Progress value={totalProgress} className="h-1.5 bg-purple-50" />
                <div className="flex justify-between text-[10px] text-slate-500 font-medium"><span>{currencySymbol}{totalSaved.toLocaleString()} Saved</span><span>Target: {currencySymbol}{totalTarget.toLocaleString()}</span></div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
                {/* ⚡ CHANGED: Icons in Tabs */}
                <TabsList className="grid w-full grid-cols-5 mb-4">{
                    [
                        { label: "All", icon: Gem },
                        { label: "Item", icon: Target },
                        { label: "Project", icon: ListChecks },
                        { label: "Vacation", icon: Plane },
                        { label: "Other", icon: MoreHorizontal }
                    ].map(({ label, icon: Icon }) => (
                        <TabsTrigger key={label} value={label} className="text-xs flex gap-1 items-center">
                            <Icon className="w-3 h-3" /> {label}
                        </TabsTrigger>
                    ))
                }</TabsList>
                <TabsContent value={activeTab} className="animate-in fade-in slide-in-from-bottom-2 space-y-3">
                    {visibleItems.length === 0 && <div className="text-center py-12 text-slate-400 flex flex-col items-center"><Goal className="w-12 h-12 opacity-20 mb-2" /> No active goals in this category.</div>}
                    {visibleItems.map(item => {
                        const progress = getProgress(item.saved_amount, item.target_amount);
                        const isExpanded = expandedId === item.id;
                        const isHigh = item.priority === 'High';

                        return (
                            <div key={item.id} className={`border rounded-xl transition-all duration-200 overflow-hidden ${getPriorityCardStyle(item.priority || 'Medium')} ${isExpanded ? 'shadow-md ring-1 ring-slate-200' : 'shadow-sm'}`}>
                                <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                                    <Checkbox checked={item.is_complete} onCheckedChange={() => toggleComplete(item)} onClick={(e) => e.stopPropagation()} className="mt-0.5 rounded-full data-[state=checked]:bg-emerald-500 border-slate-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className={`font-bold text-base truncate ${isHigh ? 'text-rose-800' : 'text-slate-800'}`}>{item.name}</h3>
                                            <span className="text-xs font-bold text-slate-600">{Math.round(progress)}%</span>
                                        </div>
                                        <Progress
                                            value={progress}
                                            className="h-1.5 bg-slate-100"
                                            indicatorClassName={getProgressColor(progress)}
                                        />
                                    </div>
                                    <div className="text-slate-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 bg-white/50 border-t border-black/5 animate-in slide-in-from-top-1">
                                        <div className="flex justify-between text-xs text-slate-500 mt-3 mb-3 font-medium">
                                            <span>Saved: {currencySymbol}{item.saved_amount?.toLocaleString()}</span>
                                            <span>Target: {currencySymbol}{item.target_amount?.toLocaleString()}</span>
                                        </div>
                                        {item.description && <p className="text-xs text-slate-600 italic mb-3 bg-white p-2 rounded border border-slate-100">{item.description}</p>}
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-9 text-xs bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 font-semibold"
                                                onClick={() => { setSelectedItemForContrib(item); setIsContributionOpen(true) }}
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Add Savings
                                            </Button>
                                            {item.link && <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => window.open(item.link!, '_blank')}><LinkIcon className="w-4 h-4 text-blue-500" /></Button>}
                                            {item.user_id === user.id && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-slate-100"><MoreHorizontal className="w-4 h-4 text-slate-500" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingItem(item)}><Pencil className="w-4 h-4 mr-2" /> Edit Details</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'item', id: item.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {hasMore && <Button variant="ghost" className="w-full text-xs text-slate-400" onClick={() => setPage(p => p + 1)}>Load More</Button>}
                </TabsContent>
            </Tabs>

            {completedItems.length > 0 && (
                <Accordion type="single" collapsible className="bg-slate-50 rounded-xl border border-slate-100 px-4 mt-4">
                    <AccordionItem value="completed" className="border-none">
                        <AccordionTrigger className="text-slate-400 hover:text-slate-600 py-2 text-sm">Completed Goals ({completedItems.length})</AccordionTrigger>
                        <AccordionContent>
                            {completedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0 border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={true}
                                            onCheckedChange={() => toggleComplete(item)}
                                            className="rounded-full border-slate-300 data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400"
                                        />
                                        <span className="line-through text-slate-400 text-sm">{item.name}</span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5 text-slate-400" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditingItem(item)}><Pencil className="w-4 h-4 mr-2" /> Edit Details</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'item', id: item.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* ⚡ FAB Label is now "Add Goal/Item" */}
            <PortalFAB onClick={() => setIsFormOpen(true)} className="h-16 w-16 rounded-full shadow-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95" icon={Plus} label="Add Goal/Item" />

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    {/* ⚡ UPDATED: Dialog Title */}
                    <DialogHeader><DialogTitle>Add New Goal/Item</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4 py-2">
                        <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11" required autoComplete="off" /></div>
                        <div><Label>Target ({currencySymbol})</Label><Input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} className="h-11" required autoComplete="off" /></div>
                        <div><Label>Initial Saved</Label><Input type="number" value={form.saved_amount} onChange={e => setForm({ ...form, saved_amount: e.target.value })} className="h-11" autoComplete="off" /></div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <Button type="submit" className="col-span-2 h-11 bg-purple-600 text-base">Create Goal</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isContributionOpen} onOpenChange={setIsContributionOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Add Funds</DialogTitle></DialogHeader><form onSubmit={handleAddContribution} className="space-y-4 py-2"><div className="space-y-2"><Label>Amount ({currencySymbol})</Label><Input type="number" className="h-14 text-2xl font-bold text-center" placeholder="0.00" value={contribForm.amount} onChange={e => setContribForm({ ...contribForm, amount: e.target.value })} autoFocus autoComplete="off" /></div><Input placeholder="Note (optional)" value={contribForm.note} onChange={e => setContribForm({ ...contribForm, note: e.target.value })} className="h-11" autoComplete="off" /><Button type="submit" className="w-full h-11 bg-emerald-600 text-lg">Confirm</Button></form></DialogContent>
            </Dialog>

            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
                {editingItem && <EditWishlistItemForm item={editingItem} onUpdate={handleUpdateItem} onClose={() => setEditingItem(null)} currencySymbol={currencySymbol} />}
            </Dialog>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Rename List</DialogTitle></DialogHeader><div className="flex gap-2 py-2"><Input value={listNameForm} onChange={e => setListNameForm(e.target.value)} className="h-11" autoComplete="off" /><Button onClick={handleRenameList}>Save</Button></div></DialogContent></Dialog>

            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Delete Item?" description="This action cannot be undone." onConfirm={handleDelete} />
        </div>
    )
}

function EditWishlistItemForm({ item, onUpdate, onClose, currencySymbol }: { item: WishlistItem, onUpdate: (u: Partial<WishlistItem>) => void, onClose: () => void, currencySymbol: string }) {
    const [form, setForm] = useState({ name: item.name, description: item.description || '', category: item.category, target_amount: item.target_amount?.toString() || '', saved_amount: item.saved_amount?.toString() || '', quantity: item.quantity?.toString() || '1', link: item.link || '', priority: item.priority || 'Medium' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = async (e: FormEvent) => { e.preventDefault(); setIsSubmitting(true); await onUpdate({ ...form, target_amount: parseFloat(form.target_amount) || null, saved_amount: parseFloat(form.saved_amount) || 0, quantity: form.category === "Item" ? parseInt(form.quantity) : null }); setIsSubmitting(false); onClose(); };
    return (
        <DialogContent className="sm:max-w-[625px] rounded-2xl"><DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4"><div className="col-span-2"><Label>Name</Label><Input name="name" value={form.name} onChange={handleChange} required autoComplete="off" /></div><div className="col-span-2"><Label>Description</Label><Textarea name="description" value={form.description} onChange={handleChange} autoComplete="off" /></div><div className="col-span-1"><Label>Target ({currencySymbol})</Label><Input name="target_amount" type="number" value={form.target_amount} onChange={handleChange} required autoComplete="off" /></div><div className="col-span-1"><Label>Saved ({currencySymbol})</Label><Input name="saved_amount" type="number" value={form.saved_amount} onChange={handleChange} autoComplete="off" /></div><div className="col-span-1"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div><div className="col-span-1"><Label>Link</Label><Input name="link" value={form.link} onChange={handleChange} autoComplete="off" /></div><DialogFooter className="col-span-2"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button></DialogFooter></form></DialogContent>
    );
}