//
"use client"

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
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
import { List, WishlistItem } from "@/lib/types"
import { Trash2, Link as LinkIcon, Plus, Pencil, Settings, Globe, Lock, ListChecks, MoreHorizontal, ChevronDown, ChevronUp, CloudOff, Target, Goal, Gem, Plane, ArrowLeft, ShoppingBag } from "lucide-react"
import { CACHE_KEYS, saveToCache, loadFromCache } from "@/lib/offline"
import { SyncQueue } from "@/lib/syncQueue"
import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"
import toast from 'react-hot-toast'

const categories = ["Item", "Project", "Vacation", "Other"]
const priorities = ["High", "Medium", "Low"]

const getPriorityCardStyle = (p: string) => {
    switch (p) {
        case 'High': return 'border-l-4 border-l-rose-500 bg-white';
        case 'Medium': return 'border-l-4 border-l-amber-400 bg-white';
        default: return 'border-l-4 border-l-slate-300 bg-white';
    }
}

const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 50) return "bg-lime-500";
    return "bg-slate-400";
};

// ⚡ RE-DESIGNED FAB
function PortalFAB({ onClick, className, icon: Icon, label }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[200] flex items-center gap-3 animate-in zoom-in duration-300 pointer-events-none">
            {label && <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto">{label}</span>}
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
            <DialogContent className="sm:max-w-sm rounded-2xl z-[250]">
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
    const ITEMS_PER_PAGE = 20;

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
            try { await Haptics.impact({ style }); } catch (e) { }
        }
    };

    const triggerNotificationHaptic = async (type: NotificationType) => {
        if (Capacitor.isNativePlatform()) {
            try { await Haptics.notification({ type }); } catch (e) { }
        }
    }

    useEffect(() => {
        let isMounted = true;
        const cacheKey = CACHE_KEYS.WISHLIST(list.id);

        const loadData = async () => {
            const cachedData = loadFromCache<WishlistItem[]>(cacheKey);
            if (cachedData && isMounted) {
                setItems(cachedData);
                setUsingCachedData(true);
                setIsLoading(false);
            }

            const { data, error } = await supabase.from("wishlist_items").select("*").eq("list_id", list.id).order("created_at", { ascending: false });

            if (!error && data && isMounted) {
                setItems(data as WishlistItem[]);
                saveToCache(cacheKey, data);
                setUsingCachedData(false);
                setIsLoading(false);
            } else if (error && isMounted && !cachedData) {
                setIsLoading(false);
            }
        };

        loadData();

        const channel = supabase.channel(`wishlist_items_${list.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `list_id=eq.${list.id}` }, (payload) => {
                const item = (payload.new || payload.old) as any;
                if (!item || !item.id) return;

                setItems(prev => {
                    if (payload.eventType === 'INSERT') return [item as WishlistItem, ...prev.filter(i => i.id !== item.id)];
                    if (payload.eventType === 'UPDATE') return prev.map(i => i.id === item.id ? item as WishlistItem : i);
                    if (payload.eventType === 'DELETE') return prev.filter(i => i.id !== item.id);
                    return prev;
                });
            })
            .subscribe()

        return () => { isMounted = false; supabase.removeChannel(channel) };
    }, [list.id]);

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
            toast.success("List renamed.");
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
            list_id: list.id, user_id: user.id, name: form.name, description: form.description || null,
            category: form.category, target_amount: isNaN(target) ? null : target, saved_amount: isNaN(saved) ? 0 : saved,
            quantity: (form.category === "Item") ? qty : null, link: form.link || null, priority: form.priority
        };

        const tempItem: WishlistItem = { id: -Date.now(), created_at: new Date().toISOString(), is_complete: false, ...newItemPayload } as any;
        setItems([tempItem, ...items]);
        saveToCache(CACHE_KEYS.WISHLIST(list.id), [tempItem, ...items]);
        SyncQueue.add({ type: 'ADD_WISHLIST_ITEM', payload: tempItem, householdId: list.household_id });

        setIsFormOpen(false);
        setForm({ name: "", description: "", category: "Item", target_amount: "", saved_amount: "", quantity: "1", link: "", priority: "Medium" });
        triggerNotificationHaptic(NotificationType.Success);
        toast.success("Goal added!");

        if (navigator.onLine) {
            const { data, error } = await supabase.from('wishlist_items').insert(newItemPayload).select().single();
            if (!error) {
                setItems(prev => prev.map(i => i.id === tempItem.id ? data as WishlistItem : i).filter(i => i.id !== tempItem.id));
                saveToCache(CACHE_KEYS.WISHLIST(list.id), [...items.filter(i => i.id !== tempItem.id), data as WishlistItem]);
            }
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
        await supabase.from('wishlist_items').update({ saved_amount: newSaved }).eq('id', selectedItemForContrib.id);
        triggerNotificationHaptic(NotificationType.Success);
        toast.success("Funds added!");
    }

    const handleUpdateItem = async (updatedItem: Partial<WishlistItem>) => {
        if (!editingItem) return;
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...updatedItem } as WishlistItem : i));
        setEditingItem(null);
        await supabase.from('wishlist_items').update(updatedItem).eq('id', editingItem.id);
        toast.success("Updated!");
    };

    const handleTogglePrivacy = async () => {
        const newStatus = !listSettings.isPrivate;
        await supabase.from('lists').update({ is_private: newStatus }).eq('id', list.id);
        setListSettings({ ...listSettings, isPrivate: newStatus });
        toast.success(`List is now ${newStatus ? 'Private' : 'Shared'}`);
    }

    const handleDelete = async () => {
        triggerHaptic(ImpactStyle.Medium);
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'item' && deleteConfirm.id) {
            setItems(items.filter(item => item.id !== deleteConfirm.id));
            await supabase.from("wishlist_items").delete().eq("id", deleteConfirm.id);
            toast.success("Deleted.");
        } else if (deleteConfirm.type === 'list') {
            await supabase.from('lists').delete().eq('id', list.id); window.location.reload();
        }
        setDeleteConfirm(null);
    }

    const toggleComplete = async (item: WishlistItem) => {
        triggerHaptic(ImpactStyle.Light);
        const newStatus = !item.is_complete;
        setItems(items.map(i => i.id === item.id ? { ...i, is_complete: newStatus } : i));
        await supabase.from("wishlist_items").update({ is_complete: newStatus }).eq("id", item.id)
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative">
            <div className="z-10 bg-slate-900 text-white px-5 py-4 shadow-md rounded-b-xl md:rounded-2xl relative overflow-hidden mb-4">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold truncate max-w-[200px]">{listSettings.name}</h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listSettings.isPrivate ? 'bg-rose-500 text-white' : 'bg-lime-500 text-slate-900'}`}>{listSettings.isPrivate ? 'Private' : 'Shared'}</span>
                            {usingCachedData && <CloudOff className="w-4 h-4 text-slate-400" />}
                        </div>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-2"><Target className="w-3 h-3" /> {items.length} goals <span className="w-1 h-1 bg-slate-500 rounded-full"></span> {currencySymbol}{totalSaved.toLocaleString()} Saved</p>
                    </div>
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"><Settings className="w-5 h-5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>List Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleTogglePrivacy}>{listSettings.isPrivate ? <Globe className="w-4 h-4 mr-2 text-cyan-500" /> : <Lock className="w-4 h-4 mr-2 text-rose-500" />} {listSettings.isPrivate ? "Make Public" : "Make Private"}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'list' })}><Trash2 className="w-4 h-4 mr-2" /> Delete List</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Progress value={totalProgress} className="h-1 bg-slate-800 rounded-none mt-3" indicatorClassName="bg-lime-500" />
            </div>

            <div className="px-2">
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
                    <TabsList className="grid w-full grid-cols-5 mb-4 bg-slate-100 p-1 rounded-xl">
                        {[
                            { label: "All", icon: Gem },
                            { label: "Item", icon: Target },
                            { label: "Project", icon: ListChecks },
                            { label: "Vacation", icon: Plane },
                            { label: "Other", icon: MoreHorizontal }
                        ].map(({ label, icon: Icon }) => (
                            <TabsTrigger key={label} value={label} className="text-[10px] flex flex-col gap-1 items-center data-[state=active]:text-slate-900 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                                <Icon className="w-3 h-3" /> {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-3 pb-32">
                        {isLoading && items.length === 0 ? <p className="text-center py-12 text-slate-400">Loading...</p> : visibleItems.length === 0 ? <div className="text-center py-12 text-slate-400 flex flex-col items-center"><Goal className="w-12 h-12 opacity-20 mb-2" /> No active goals.</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {visibleItems.map(item => {
                                    const progress = getProgress(item.saved_amount, item.target_amount);
                                    const isExpanded = expandedId === item.id;
                                    const isHigh = item.priority === 'High';

                                    return (
                                        <div key={item.id} className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white shadow-sm ${getPriorityCardStyle(item.priority || 'Medium')} ${isExpanded ? 'ring-1 ring-lime-200' : ''}`}>
                                            <div className="p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                                                    <Checkbox checked={item.is_complete} onCheckedChange={() => toggleComplete(item)} onClick={(e) => e.stopPropagation()} className="mt-0.5 rounded-full data-[state=checked]:bg-emerald-500 border-slate-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h3 className={`font-bold text-sm truncate ${isHigh ? 'text-rose-800' : 'text-slate-800'}`}>{item.name}</h3>
                                                            <span className="text-xs font-bold text-slate-600">{Math.round(progress)}%</span>
                                                        </div>
                                                        <Progress value={progress} className="h-1.5 bg-slate-100" indicatorClassName={getProgressColor(progress)} />
                                                    </div>
                                                </div>

                                                {/* ⚡ FIX: Dropdown is now always visible on the card */}
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : item.id)} className="h-8 w-8 text-slate-400">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"><MoreHorizontal className="w-4 h-4 text-slate-500" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setEditingItem(item)}><Pencil className="w-4 h-4 mr-2" /> Edit Details</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'item', id: item.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-0 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-1">
                                                    <div className="flex justify-between text-xs text-slate-500 mt-3 mb-3 font-medium">
                                                        <span>Saved: {currencySymbol}{item.saved_amount?.toLocaleString()}</span>
                                                        <span>Target: {currencySymbol}{item.target_amount?.toLocaleString()}</span>
                                                    </div>
                                                    {item.description && <p className="text-xs text-slate-600 italic mb-3 bg-white p-2 rounded border border-slate-100">{item.description}</p>}
                                                    <div className="flex gap-2 mt-2">
                                                        <Button size="sm" variant="outline" className="flex-1 h-9 text-xs bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 font-semibold" onClick={() => { setSelectedItemForContrib(item); setIsContributionOpen(true) }}><Plus className="w-3 h-3 mr-1" /> Add Savings</Button>
                                                        {item.link && <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => window.open(item.link!, '_blank')}><LinkIcon className="w-4 h-4 text-blue-500" /></Button>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {hasMore && (
                            <Button variant="ghost" className="w-full text-xs text-slate-400 py-4" onClick={() => setPage(p => p + 1)}>
                                Load More Goals
                            </Button>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {completedItems.length > 0 && (
                <Accordion type="single" collapsible className="bg-slate-50 rounded-xl border border-slate-100 px-4 mt-4 mx-4 mb-24">
                    <AccordionItem value="completed" className="border-none">
                        <AccordionTrigger className="text-slate-400 hover:text-slate-600 py-2 text-sm">Completed Goals ({completedItems.length})</AccordionTrigger>
                        <AccordionContent>
                            {completedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0 border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <Checkbox checked={true} onCheckedChange={() => toggleComplete(item)} className="rounded-full border-slate-300 data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400" />
                                        <span className="line-through text-slate-400 text-sm">{item.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-300" onClick={() => setDeleteConfirm({ isOpen: true, type: 'item', id: item.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            <PortalFAB onClick={() => setIsFormOpen(true)} className="h-16 w-16 rounded-full shadow-2xl bg-lime-500 hover:bg-lime-600 text-slate-900 flex items-center justify-center transition-transform hover:scale-105 active:scale-95" icon={Plus} label="New Goal" />

            {/* Dialogs ... */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl z-[250]">
                    <DialogHeader><DialogTitle>Add New Goal/Item</DialogTitle><DialogDescription>Define a new saving goal or item target.</DialogDescription></DialogHeader>
                    <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4 py-2">
                        <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11" required autoComplete="off" /></div>
                        <div><Label>Target ({currencySymbol})</Label><Input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} className="h-11" required autoComplete="off" /></div>
                        <div><Label>Initial Saved</Label><Input type="number" value={form.saved_amount} onChange={e => setForm({ ...form, saved_amount: e.target.value })} className="h-11" autoComplete="off" /></div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <Button type="submit" className="col-span-2 h-11 bg-lime-600 text-slate-900 font-bold text-base hover:bg-lime-700">Create Goal</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isContributionOpen} onOpenChange={setIsContributionOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl z-[250]">
                    <DialogHeader><DialogTitle>Add Funds</DialogTitle><DialogDescription>Enter the amount you are contributing.</DialogDescription></DialogHeader>
                    <form onSubmit={handleAddContribution} className="space-y-4 py-2">
                        <div className="space-y-2"><Label>Amount ({currencySymbol})</Label><Input type="number" className="h-14 text-2xl font-bold text-center" placeholder="0.00" value={contribForm.amount} onChange={e => setContribForm({ ...contribForm, amount: e.target.value })} autoFocus autoComplete="off" /></div>
                        <Input placeholder="Note (optional)" value={contribForm.note} onChange={e => setContribForm({ ...contribForm, note: e.target.value })} className="h-11" autoComplete="off" />
                        <Button type="submit" className="w-full h-11 bg-emerald-600 text-lg">Confirm</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
                {editingItem && (
                    <DialogContent className="sm:max-w-[625px] rounded-2xl z-[250]">
                        <DialogHeader><DialogTitle>Edit Goal</DialogTitle><DialogDescription>Modify the details of your goal.</DialogDescription></DialogHeader>
                        <EditWishlistItemForm item={editingItem} onUpdate={handleUpdateItem} onClose={() => setEditingItem(null)} currencySymbol={currencySymbol} />
                    </DialogContent>
                )}
            </Dialog>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl z-[250]">
                    <DialogHeader><DialogTitle>Rename List</DialogTitle><DialogDescription>Enter a new name for this list.</DialogDescription></DialogHeader>
                    <div className="flex gap-2 py-2"><Input value={listNameForm} onChange={e => setListNameForm(e.target.value)} className="h-11" autoComplete="off" /><Button onClick={handleRenameList}>Save</Button></div>
                </DialogContent>
            </Dialog>

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
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4"><div className="col-span-2"><Label>Name</Label><Input name="name" value={form.name} onChange={handleChange} required autoComplete="off" /></div><div className="col-span-2"><Label>Description</Label><Textarea name="description" value={form.description} onChange={handleChange} autoComplete="off" /></div><div className="col-span-1"><Label>Target ({currencySymbol})</Label><Input name="target_amount" type="number" value={form.target_amount} onChange={handleChange} required autoComplete="off" /></div><div className="col-span-1"><Label>Saved ({currencySymbol})</Label><Input name="saved_amount" type="number" value={form.saved_amount} onChange={handleChange} autoComplete="off" /></div><div className="col-span-1"><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div><div className="col-span-1"><Label>Link</Label><Input name="link" value={form.link} onChange={handleChange} autoComplete="off" /></div><DialogFooter className="col-span-2"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button></DialogFooter></form>
    );
}