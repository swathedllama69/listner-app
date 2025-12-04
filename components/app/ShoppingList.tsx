"use client"

import { useState, useEffect, FormEvent, ChangeEvent, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase" // Fixed import
import { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Trash2, CheckCircle, Hand, ChevronUp, ChevronDown,
    Share2, Settings, Pencil, Lock, Globe, Plus, AlertCircle,
    Copy, FileText, ListChecks, Lightbulb, MoreHorizontal, ArrowUpDown, TrendingUp, AlertTriangle, Info, CloudOff, ShoppingBag, CheckCircle2, X, ArrowDownCircle
} from "lucide-react"
import { List } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { CACHE_KEYS, saveToCache, loadFromCache } from "@/lib/offline" // Fixed import
import { SyncQueue } from "@/lib/syncQueue"
import { Progress } from "@/components/ui/progress"
import { Capacitor } from "@capacitor/core" // Fixed import
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics" // Fixed import
import { Virtuoso } from 'react-virtuoso'

type ShoppingItem = {
    id: number; created_at: string; name: string; quantity: string | null;
    price: number | null; notes: string | null; is_complete: boolean;
    user_id: string; priority: 'Low' | 'Medium' | 'High';
    is_pending?: boolean;
}

const priorities = ['Low', 'Medium', 'High'];

const getPriorityBorderClass = (priority: string) => {
    switch (priority) {
        case 'High': return 'border-l-4 border-l-rose-500';
        case 'Medium': return 'border-l-4 border-l-amber-400';
        default: return 'border-l-4 border-l-slate-300';
    }
};

function PortalFAB({ onClick, className, icon: Icon }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100]">
            <Button onClick={onClick} className={className}>
                <Icon className="w-8 h-8" />
            </Button>
        </div>,
        document.body
    );
}

function AlertDialog({ isOpen, onOpenChange, title, description }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-blue-500" /> {title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
                <DialogFooter><Button onClick={() => onOpenChange(false)} className="w-full">OK</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ConfirmDialog({ isOpen, onOpenChange, title, description, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> {title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter className="flex gap-2 sm:justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm</Button></DialogFooter></DialogContent>
        </Dialog>
    )
}

export function ShoppingList({ user, list, currencySymbol }: { user: User, list: List, currencySymbol: string }) {
    const [items, setItems] = useState<ShoppingItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedItems, setSelectedItems] = useState<number[]>([])
    const [usingCachedData, setUsingCachedData] = useState(false);

    const [sortBy, setSortBy] = useState("priority");
    const [filterTime, setFilterTime] = useState("all");

    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, type: 'item' | 'list' | 'bulk' | 'completed', id?: number } | null>(null)
    const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
    const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, desc: string }>({ isOpen: false, title: '', desc: '' });

    const [listSettings, setListSettings] = useState({ name: list.name, isPrivate: list.is_private })
    const [form, setForm] = useState({ name: "", quantity: "1", price: "", notes: "", priority: "Medium" })

    const LIMIT = 50;
    const [visibleCount, setVisibleCount] = useState(20);

    const inputRef = useRef<HTMLInputElement>(null)

    const isOwner = user.id === list.owner_id;
    const showAlert = (title: string, desc: string) => setAlertInfo({ isOpen: true, title, desc });

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
        async function getItems() {
            const cacheKey = CACHE_KEYS.SHOPPING_LIST(list.id);
            const cachedData = loadFromCache<ShoppingItem[]>(cacheKey);

            if (cachedData) {
                setItems(cachedData);
                setUsingCachedData(true);
                setIsLoading(false);
            } else {
                setIsLoading(true);
            }

            const { data, error } = await supabase.from("shopping_items").select("*").eq("list_id", list.id);

            if (!error && data) {
                setItems(data as ShoppingItem[]);
                saveToCache(cacheKey, data);
                setUsingCachedData(false);
            }
            setIsLoading(false);
        }
        getItems()

        const channel = supabase.channel(`shopping_${list.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${list.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') setItems(prev => [payload.new as ShoppingItem, ...prev])
                if (payload.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new as ShoppingItem : i))
                if (payload.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== payload.old.id))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [list.id])

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });
    const handlePriorityChange = (value: string) => setForm({ ...form, priority: value });

    const handleCopyText = () => {
        const text = items.map(i => `- ${i.name}`).join('\n');
        navigator.clipboard.writeText(text);
        triggerHaptic(ImpactStyle.Medium);
        showAlert("Success", "List copied to clipboard!");
    };

    const handleDownloadTxt = () => {
        const text = items.map(i => `- ${i.name}`).join('\n');
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${listSettings.name}.txt`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleNativeShare = async () => {
        const text = items.map(i => `- ${i.name}`).join('\n');
        if (navigator.share) {
            try { await navigator.share({ title: listSettings.name, text: text }); } catch (err) { console.error(err); }
        } else { handleCopyText(); }
    };

    const handleRenameList = async () => {
        const { error } = await supabase.from('lists').update({ name: listSettings.name }).eq('id', list.id);
        if (!error) { setIsRenameOpen(false); }
    }

    const handleTogglePrivacy = async () => {
        const newStatus = !listSettings.isPrivate;
        const { error } = await supabase.from('lists').update({ is_private: newStatus }).eq('id', list.id);
        if (!error) { setListSettings({ ...listSettings, isPrivate: newStatus }); showAlert("Updated", `List is now ${newStatus ? 'Private' : 'Shared'}`); }
    }

    const handleDelete = async () => {
        triggerHaptic(ImpactStyle.Medium);
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'item' && deleteConfirm.id) {
            const oldItems = [...items];
            setItems(items.filter(item => item.id !== deleteConfirm.id));

            const { error } = await supabase.from("shopping_items").delete().eq("id", deleteConfirm.id);
            if (error) setItems(oldItems);

        } else if (deleteConfirm.type === 'list') {
            await supabase.from('lists').delete().eq('id', list.id);
            window.location.reload();
        } else if (deleteConfirm.type === 'bulk') {
            const toDelete = selectedItems;
            const oldItems = [...items];
            setItems(items.filter(i => !selectedItems.includes(i.id)));
            setSelectedItems([]);

            const { error } = await supabase.from("shopping_items").delete().in("id", toDelete);
            if (error) setItems(oldItems);

        } else if (deleteConfirm.type === 'completed') {
            const completedIds = items.filter(i => i.is_complete).map(i => i.id);
            const oldItems = [...items];
            setItems(items.filter(i => !i.is_complete));

            const { error } = await supabase.from("shopping_items").delete().in("id", completedIds);
            if (error) setItems(oldItems);
        }
        setDeleteConfirm(null);
    }

    const handleAddItem = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (form.name.trim() === "") return;

        triggerHaptic(ImpactStyle.Light);

        const priceInput = parseFloat(form.price);
        const safePrice = isNaN(priceInput) ? 0 : priceInput;

        const newItemPayload = {
            name: form.name,
            quantity: form.quantity || '1',
            price: safePrice,
            notes: form.notes || null,
            list_id: list.id,
            user_id: user.id,
            priority: form.priority
        };

        const tempItem: ShoppingItem = {
            id: -Date.now(),
            created_at: new Date().toISOString(),
            is_complete: false,
            is_pending: true,
            ...newItemPayload
        } as any;

        const newItems = [tempItem, ...items];
        setItems(newItems);
        saveToCache(CACHE_KEYS.SHOPPING_LIST(list.id), newItems);

        setForm({ name: "", quantity: "1", price: "", notes: "", priority: "Medium" });
        inputRef.current?.focus();

        const executeOfflineSave = () => {
            SyncQueue.add({
                type: 'ADD_SHOPPING_ITEM',
                payload: tempItem,
                householdId: list.household_id
            });
            triggerNotificationHaptic(NotificationType.Success);
        };

        if (navigator.onLine) {
            try {
                const { data, error } = await supabase.from("shopping_items").insert(newItemPayload).select().single();

                if (error) throw error;

                setItems(prev => prev.map(i => i.id === tempItem.id ? data as ShoppingItem : i));
                const updatedItems = newItems.map(i => i.id === tempItem.id ? data as ShoppingItem : i);
                saveToCache(CACHE_KEYS.SHOPPING_LIST(list.id), updatedItems);

                triggerNotificationHaptic(NotificationType.Success);
            } catch (err) {
                console.warn("Online save failed, falling back to offline mode.", err);
                executeOfflineSave();
            }
        } else {
            executeOfflineSave();
        }
    }

    const handleUpdateItem = async (updatedItem: any) => {
        if (!editingItem) return;

        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...updatedItem } : i));
        setEditingItem(null);

        const safePrice = parseFloat(updatedItem.price);
        const { data, error } = await supabase.from('shopping_items').update({
            name: updatedItem.name, quantity: updatedItem.quantity, price: isNaN(safePrice) ? 0 : safePrice,
            priority: updatedItem.priority, notes: updatedItem.notes
        }).eq('id', editingItem.id).select().single();

        if (error) {
            showAlert("Error", "Update failed: " + error.message);
        }
    }

    const toggleComplete = async (item: ShoppingItem) => {
        triggerHaptic(ImpactStyle.Light);

        const newStatus = !item.is_complete;
        setItems(items.map(i => i.id === item.id ? { ...i, is_complete: newStatus } : i));

        const { error } = await supabase.from("shopping_items").update({ is_complete: newStatus }).eq("id", item.id)
        if (error) {
            setItems(items.map(i => i.id === item.id ? { ...i, is_complete: !newStatus } : i));
        }
    }

    const handleDeleteItem = async (itemId: number) => {
        triggerHaptic(ImpactStyle.Medium);
        const oldItems = [...items];
        setItems(items.filter(item => item.id !== itemId));

        const { error } = await supabase.from("shopping_items").delete().eq("id", itemId)
        if (error) setItems(oldItems);
    }

    const toggleSelectItem = (itemId: number) => setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    const handleBulkComplete = async () => {
        if (selectedItems.length === 0) return;
        triggerHaptic(ImpactStyle.Medium);

        setItems(items.map(i => selectedItems.includes(i.id) ? { ...i, is_complete: true } : i));
        setSelectedItems([]);

        await supabase.from("shopping_items").update({ is_complete: true }).in("id", selectedItems);
    };

    const processedItems = items.filter(i => !i.is_complete).sort((a, b) => {
        if (sortBy === 'priority') {
            const pWeight: any = { High: 3, Medium: 2, Low: 1 };
            // @ts-ignore
            return (pWeight[b.priority || 'Medium'] - pWeight[a.priority || 'Medium']);
        }
        if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const visibleItems = processedItems.slice(0, visibleCount);
    const hasMore = visibleCount < processedItems.length;

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + 25, processedItems.length));
    };

    const completedItems = items.filter(item => item.is_complete);
    const totalItems = items.length;
    const totalCompleted = completedItems.length;
    const progressPercent = totalItems === 0 ? 0 : (totalCompleted / totalItems) * 100;

    const total = processedItems.reduce((sum, i) => sum + ((i.price || 0) * (parseInt(i.quantity || '1'))), 0);
    const isBulkMode = selectedItems.length > 0;
    const formPrice = parseFloat(form.price) || 0;
    const formQty = parseInt(form.quantity) || 1;
    const formTotal = formPrice * formQty;

    return (
        <Card className={`w-full rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm relative border-none min-h-[80vh] flex flex-col transition-opacity duration-500 ${usingCachedData ? 'opacity-90 grayscale-[10%]' : ''}`}>
            {/* Header Section - Tweaked top margin so it fits closer to back button */}
            <div className="z-10 bg-slate-900 text-white px-6 py-5 shadow-md flex items-center justify-between rounded-t-none md:rounded-t-2xl overflow-hidden mt-1">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold truncate max-w-[200px]">{listSettings.name}</h2>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${listSettings.isPrivate ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>{listSettings.isPrivate ? 'Private' : 'Shared'}</span>
                        {usingCachedData && <CloudOff className="w-4 h-4 text-slate-400" />}
                    </div>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                        <ShoppingBag className="w-3 h-3" /> {items.length} items
                        <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                        {listSettings.isPrivate ? "Private" : "Shared"}
                    </p>
                </div>
                <div className="relative z-10 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Est.</p>
                    {/* ⚡ UPDATED: Total Cost Color */}
                    <div className="text-2xl font-bold text-blue-400">{currencySymbol}{total.toLocaleString()}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-900 pb-1">
                {/* ⚡ UPDATED: Shrink Progress Bar (h-1.5) */}
                <Progress value={progressPercent} className="h-1.5 bg-slate-800 rounded-none" indicatorClassName="bg-blue-500" />
            </div>


            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-white"><ArrowUpDown className="w-3 h-3" /> Sort</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                                <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="price">Price (High)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="date">Date Added</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Filter</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={filterTime} onValueChange={setFilterTime}>
                                <DropdownMenuRadioItem value="all">All Time</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="month">This Month</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNativeShare}><Share2 className="w-4 h-4 text-slate-500" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4 text-slate-500" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsRenameOpen(true)}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleTogglePrivacy}><Globe className="w-4 h-4 mr-2" /> {listSettings.isPrivate ? "Make Public" : "Make Private"}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {completedItems.length > 0 && (
                                <DropdownMenuItem className="text-rose-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'completed' })}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Clear Completed
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'list' })}><Trash2 className="w-4 h-4 mr-2" /> Delete List</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <CardContent className="pt-4 pb-32 flex-1 px-2 md:px-6">
                {isLoading ? <p className="text-center py-8 text-slate-400">Loading...</p> : (
                    <>
                        {visibleItems.length > 0 ? (
                            <Virtuoso
                                style={{ height: '100%', minHeight: '400px' }}
                                useWindowScroll
                                data={visibleItems}
                                itemContent={(index, item) => {
                                    const hasPrice = item.price && item.price > 0;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`group flex justify-between items-center p-2 mb-2 border-b border-slate-100 bg-white hover:bg-slate-50 transition-all ${getPriorityBorderClass(item.priority)} ${item.is_pending ? 'opacity-70' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="text-xs font-bold text-black w-5 text-center">{index + 1}.</span>
                                                <Checkbox checked={false} onCheckedChange={() => toggleComplete(item)} className="rounded-full w-5 h-5 border-2 border-slate-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                                                <div className="flex-1 min-w-0 ml-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-semibold text-sm text-slate-900 truncate">{item.name}</span>
                                                        {item.is_pending && <CloudOff className="w-3 h-3 text-amber-500" />}
                                                    </div>
                                                    {parseInt(item.quantity || '1') > 1 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded">x{item.quantity}</span>}
                                                    {item.notes && <span className="text-[10px] text-slate-400 truncate ml-2">{item.notes}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pl-2">
                                                <div className="text-right min-w-[60px]">
                                                    {hasPrice ? (
                                                        <span className="font-bold text-sm text-slate-700 block">{currencySymbol}{((item.price || 0) * parseInt(item.quantity || '1')).toLocaleString()}</span>
                                                    ) : <span className="text-[10px] text-slate-300">--</span>}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingItem(item)}><Pencil className="w-4 h-4 mr-2" /> Edit Item</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'item', id: item.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    );
                                }}
                                components={{
                                    Footer: () => hasMore ? (
                                        <div className="flex justify-center py-4">
                                            <Button variant="outline" onClick={loadMore} className="gap-2 text-slate-500 border-slate-300">
                                                <ArrowDownCircle className="w-4 h-4" /> Load More ({processedItems.length - visibleCount} left)
                                            </Button>
                                        </div>
                                    ) : null
                                }}
                            />
                        ) : (
                            <div className="text-center py-12 text-slate-400 flex flex-col items-center"><ListChecks className="w-12 h-12 opacity-20 mb-2" /> Your list is empty.</div>
                        )}
                    </>
                )}

                {completedItems.length > 0 && (
                    <Accordion type="single" collapsible className="mt-6 w-full">
                        <AccordionItem value="completed" className="border-none">
                            <AccordionTrigger className="text-slate-400 hover:text-slate-600 py-2 text-sm">Show Completed ({completedItems.length})</AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 opacity-60">
                                    {completedItems.map((item) => (
                                        <li key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="flex items-center gap-3"><Checkbox checked={true} onCheckedChange={() => toggleComplete(item)} className="rounded-full" /><span className="line-through text-slate-500 text-sm">{item.name}</span></div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-slate-400" /></Button>
                                        </li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardContent>

            <PortalFAB onClick={() => setIsAddOpen(true)} className="h-16 w-16 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95" icon={Plus} />

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl top-[20%] translate-y-0">
                    <DialogHeader><DialogTitle>Add Shopping Item</DialogTitle></DialogHeader>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-700 flex gap-2 items-start mb-2"><Lightbulb className="w-4 h-4 shrink-0 mt-0.5" /><div>Add items here. If you enter a price and quantity, the total cost will be calculated automatically.</div></div>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-4 gap-3"><div className="col-span-3"><Label>Item Name</Label><Input ref={inputRef} value={form.name} onChange={handleFormChange} name="name" className="h-12 text-lg" autoFocus autoComplete="off" /></div><div className="col-span-1"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={handleFormChange} name="quantity" className="h-12 text-center" autoComplete="off" /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div><Label>Price ({currencySymbol})</Label><Input type="number" value={form.price} onChange={handleFormChange} name="price" step="0.01" className="h-11" autoComplete="off" /></div>
                            <div>
                                <Label>Priority</Label>
                                <Select value={form.priority as any} onValueChange={handlePriorityChange}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        {formPrice > 0 && <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-xs text-slate-500 font-medium">Item Total</span><span className="text-sm font-bold text-slate-800">{currencySymbol}{formPrice.toLocaleString()} <span className="text-slate-400 text-xs font-normal">x {formQty} =</span> {currencySymbol}{formTotal.toLocaleString()}</span></div>}
                        <div><Label>Notes</Label><Input value={form.notes} onChange={handleFormChange} name="notes" placeholder="Brand, Size, etc." className="h-11" autoComplete="off" /></div>
                        <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">Add to List</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>{editingItem && <EditShoppingItemForm item={editingItem} onUpdate={handleUpdateItem} onClose={() => setEditingItem(null)} currencySymbol={currencySymbol} />}</Dialog>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Rename List</DialogTitle></DialogHeader><div className="flex gap-2 py-2"><Input value={listSettings.name} onChange={e => setListSettings({ ...listSettings, name: e.target.value })} className="h-11" autoComplete="off" /><Button onClick={handleRenameList}>Save</Button></div></DialogContent></Dialog>

            {isBulkMode && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5"><span className="font-bold text-sm whitespace-nowrap">{selectedItems.length} selected</span><div className="h-4 w-[1px] bg-slate-700"></div><button onClick={handleBulkComplete} className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Done</button><button onClick={() => setDeleteConfirm({ isOpen: true, type: 'bulk' })} className="text-rose-400 font-medium flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button><button onClick={() => setSelectedItems([])} className="text-slate-400 ml-2">Cancel</button></div>}

            <AlertDialog isOpen={alertInfo.isOpen} onOpenChange={(o) => setAlertInfo({ ...alertInfo, isOpen: o })} title={alertInfo.title} description={alertInfo.desc} />

            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Delete?" description={deleteConfirm?.type === 'completed' ? "Remove all completed items?" : "Irreversible."} onConfirm={handleDelete} />
        </Card>
    )
}

function EditShoppingItemForm({ item, onUpdate, onClose, currencySymbol }: { item: ShoppingItem, onUpdate: (item: any) => void, onClose: () => void, currencySymbol: string }) {
    const [form, setForm] = useState({ name: item.name, quantity: item.quantity || "1", price: item.price?.toString() || "", notes: item.notes || "", priority: item.priority || "Medium" });
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); onUpdate(form); };
    return (
        <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3"><Label>Item Name</Label><Input value={form.name} onChange={handleChange} name="name" className="h-11" autoComplete="off" /></div>
                    <div className="col-span-1"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={handleChange} name="quantity" className="h-11 text-center" autoComplete="off" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><Label>Price ({currencySymbol})</Label><Input type="number" value={form.price} onChange={handleChange} name="price" className="h-11" autoComplete="off" /></div>
                    <div>
                        <Label>Priority</Label>
                        <Select value={form.priority as any} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={handleChange} name="notes" className="h-11" autoComplete="off" /></div>
                <DialogFooter><Button type="submit" className="w-full h-11 bg-blue-600">Save Changes</Button></DialogFooter>
            </form>
        </DialogContent>
    )
}