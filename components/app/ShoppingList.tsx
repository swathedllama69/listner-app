"use client"

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Trash2, CheckCircle, Hand, ChevronUp, ChevronDown,
    Share2, Settings, Pencil, Lock, Globe, Plus, AlertCircle,
    Copy, FileText, ListChecks, Lightbulb, MoreHorizontal, ArrowUpDown, TrendingUp, AlertTriangle, Info
} from "lucide-react"
import { List } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

type ShoppingItem = {
    id: number; created_at: string; name: string; quantity: string | null;
    price: number | null; notes: string | null; is_complete: boolean;
    user_id: string; priority: 'Low' | 'Medium' | 'High'
}

const priorities = ['Low', 'Medium', 'High'];

// Minimalist Left Border Color for Priority
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

    const [sortBy, setSortBy] = useState("priority");
    const [filterTime, setFilterTime] = useState("all");

    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, type: 'item' | 'list' | 'bulk', id?: number } | null>(null)
    const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)

    // New: Simple Alert State
    const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean, title: string, desc: string }>({ isOpen: false, title: '', desc: '' });

    const [listSettings, setListSettings] = useState({ name: list.name, isPrivate: list.is_private })
    const [form, setForm] = useState({ name: "", quantity: "1", price: "", notes: "", priority: "Medium" })

    const isOwner = user.id === list.owner_id;

    const showAlert = (title: string, desc: string) => setAlertInfo({ isOpen: true, title, desc });

    useEffect(() => {
        async function getItems() {
            setIsLoading(true)
            const { data, error } = await supabase.from("shopping_items").select("*").eq("list_id", list.id)
            if (!error) setItems(data as ShoppingItem[])
            setIsLoading(false)
        }
        getItems()
    }, [list.id])

    // --- HANDLERS ---
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });
    const handlePriorityChange = (value: string) => setForm({ ...form, priority: value });

    const handleCopyText = () => {
        const text = items.map(i => `- ${i.name}`).join('\n');
        navigator.clipboard.writeText(text);
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
        if (!error) setIsRenameOpen(false);
    }

    const handleTogglePrivacy = async () => {
        const newStatus = !listSettings.isPrivate;
        const { error } = await supabase.from('lists').update({ is_private: newStatus }).eq('id', list.id);
        if (!error) { setListSettings({ ...listSettings, isPrivate: newStatus }); showAlert("Updated", `List is now ${newStatus ? 'Private' : 'Shared'}`); }
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'item' && deleteConfirm.id) {
            await supabase.from("shopping_items").delete().eq("id", deleteConfirm.id);
            setItems(items.filter(item => item.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'list') {
            await supabase.from('lists').delete().eq('id', list.id);
            window.location.reload();
        } else if (deleteConfirm.type === 'bulk') {
            await supabase.from("shopping_items").delete().in("id", selectedItems);
            setItems(items.filter(i => !selectedItems.includes(i.id)));
            setSelectedItems([]);
        }
        setDeleteConfirm(null);
    }

    const handleAddItem = async (e: FormEvent) => {
        e.preventDefault();
        if (form.name.trim() === "") return;
        const priceInput = parseFloat(form.price);
        const safePrice = isNaN(priceInput) ? 0 : priceInput;

        const { data, error } = await supabase.from("shopping_items").insert({
            name: form.name, quantity: form.quantity || '1', price: safePrice,
            notes: form.notes || null, list_id: list.id, user_id: user.id, priority: form.priority
        }).select().single();

        if (!error) {
            setItems([...items, data as ShoppingItem]);
            setForm({ name: "", quantity: "1", price: "", notes: "", priority: "Medium" });
            setIsAddOpen(false);
        } else {
            showAlert("Error", "Could not add item: " + error.message);
        }
    }

    const handleUpdateItem = async (updatedItem: any) => {
        if (!editingItem) return;
        const safePrice = parseFloat(updatedItem.price);
        const { data, error } = await supabase.from('shopping_items').update({
            name: updatedItem.name, quantity: updatedItem.quantity, price: isNaN(safePrice) ? 0 : safePrice,
            priority: updatedItem.priority, notes: updatedItem.notes
        }).eq('id', editingItem.id).select().single();

        if (!error) {
            setItems(items.map(i => i.id === editingItem.id ? data as ShoppingItem : i));
            setEditingItem(null);
        } else {
            showAlert("Error", "Update failed: " + error.message);
        }
    }

    const toggleComplete = async (item: ShoppingItem) => {
        const { error } = await supabase.from("shopping_items").update({ is_complete: !item.is_complete }).eq("id", item.id)
        if (!error) {
            setItems(items.map(i => i.id === item.id ? { ...i, is_complete: !i.is_complete } : i));
        }
    }

    const handleDeleteItem = async (itemId: number) => {
        const { error } = await supabase.from("shopping_items").delete().eq("id", itemId)
        if (!error) setItems(items.filter(item => item.id !== itemId))
    }

    const toggleSelectItem = (itemId: number) => setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    const handleBulkComplete = async () => {
        if (selectedItems.length === 0) return;
        await supabase.from("shopping_items").update({ is_complete: true }).in("id", selectedItems);
        setItems(items.map(i => selectedItems.includes(i.id) ? { ...i, is_complete: true } : i));
        setSelectedItems([]);
    };

    // --- SORT & FILTER ---
    const processedItems = items.filter(i => !i.is_complete).sort((a, b) => {
        if (sortBy === 'priority') {
            const pWeight: any = { High: 3, Medium: 2, Low: 1 };
            // @ts-ignore
            return (pWeight[b.priority || 'Medium'] - pWeight[a.priority || 'Medium']);
        }
        if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const completedItems = items.filter(item => item.is_complete);
    const total = processedItems.reduce((sum, i) => sum + ((i.price || 0) * (parseInt(i.quantity || '1'))), 0);
    const itemsMissingPrice = processedItems.some(item => !item.price || item.price === 0);
    const isBulkMode = selectedItems.length > 0;
    const formPrice = parseFloat(form.price) || 0;
    const formQty = parseInt(form.quantity) || 1;
    const formTotal = formPrice * formQty;

    return (
        <Card className="w-full rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm relative border-none min-h-[80vh] flex flex-col">

            {/* STICKY MERGED HEADER - FIXED OFFSET */}
            <div className="sticky top-[72px] z-10 bg-slate-900 text-white px-6 py-5 shadow-md flex items-center justify-between rounded-t-none md:rounded-t-2xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold truncate max-w-[200px]">{listSettings.name}</h2>
                        {listSettings.isPrivate && <Lock className="w-4 h-4 text-slate-400" />}
                    </div>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                        {items.length} items
                        <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                        {listSettings.isPrivate ? "Private" : "Shared"}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Est.</p>
                    <div className="text-2xl font-bold text-emerald-400">{currencySymbol}{total.toLocaleString()}</div>
                </div>
            </div>

            {/* SUB-HEADER ACTIONS */}
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
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4 text-slate-500" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleTogglePrivacy}><Globe className="w-4 h-4 mr-2" /> {listSettings.isPrivate ? "Make Public" : "Make Private"}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ isOpen: true, type: 'list' })}><Trash2 className="w-4 h-4 mr-2" /> Delete List</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <CardContent className="pt-4 pb-32 flex-1 px-2 md:px-6">
                {isLoading ? <p className="text-center py-8 text-slate-400">Loading...</p> : (
                    <ul className="space-y-2">
                        {processedItems.map((item, index) => {
                            const hasPrice = item.price && item.price > 0;
                            return (
                                <li key={item.id} className={`group flex justify-between items-center p-2 border-b border-slate-100 bg-white hover:bg-slate-50 transition-all ${getPriorityBorderClass(item.priority)}`}>
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* BOLD BLACK S/N */}
                                        <span className="text-xs font-bold text-black w-5 text-center">{index + 1}.</span>

                                        {/* DARKER CHECKBOX */}
                                        <Checkbox checked={false} onCheckedChange={() => toggleComplete(item)} className="rounded-sm w-5 h-5 border-2 border-slate-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />

                                        <div className="flex-1 min-w-0 ml-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-sm text-slate-900 truncate">{item.name}</span>
                                                {/* Priority is now handled by Border Color, removed badge for cleaner look */}
                                            </div>
                                            {/* Show Quantity Big if > 1 */}
                                            {parseInt(item.quantity || '1') > 1 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded">x{item.quantity}</span>}
                                            {item.notes && <span className="text-[10px] text-slate-400 truncate ml-2">{item.notes}</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pl-2">
                                        {/* PRICE */}
                                        <div className="text-right min-w-[60px]">
                                            {hasPrice ? (
                                                <span className="font-bold text-sm text-slate-700 block">{currencySymbol}{((item.price || 0) * parseInt(item.quantity || '1')).toLocaleString()}</span>
                                            ) : <span className="text-[10px] text-slate-300">--</span>}
                                        </div>

                                        {/* ACTION MENU */}
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
                                </li>
                            )
                        })}
                        {processedItems.length === 0 && <div className="text-center py-12 text-slate-400 flex flex-col items-center"><ListChecks className="w-12 h-12 opacity-20 mb-2" /> Your list is empty.</div>}
                    </ul>
                )}

                {/* COMPLETED ITEMS */}
                {completedItems.length > 0 && (
                    <Accordion type="single" collapsible className="mt-6 w-full">
                        <AccordionItem value="completed" className="border-none">
                            <AccordionTrigger className="text-slate-400 hover:text-slate-600 py-2 text-sm">Show Completed ({completedItems.length})</AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 opacity-60">
                                    {completedItems.map((item) => (
                                        <li key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="flex items-center gap-3"><Checkbox checked={true} onCheckedChange={() => toggleComplete(item)} /><span className="line-through text-slate-500 text-sm">{item.name}</span></div>
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

            {/* ADD DIALOG */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl top-[20%] translate-y-0">
                    <DialogHeader><DialogTitle>Add Shopping Item</DialogTitle></DialogHeader>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-700 flex gap-2 items-start mb-2"><Lightbulb className="w-4 h-4 shrink-0 mt-0.5" /><div>Add items here. If you enter a price and quantity, the total cost will be calculated automatically.</div></div>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-4 gap-3"><div className="col-span-3"><Label>Item Name</Label><Input value={form.name} onChange={handleFormChange} name="name" className="h-12 text-lg" autoFocus /></div><div className="col-span-1"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={handleFormChange} name="quantity" className="h-12 text-center" /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div><Label>Price ({currencySymbol})</Label><Input type="number" value={form.price} onChange={handleFormChange} name="price" step="0.01" className="h-11" /></div>
                            <div>
                                <Label>Priority</Label>
                                <Select value={form.priority as any} onValueChange={handlePriorityChange}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        {formPrice > 0 && <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-xs text-slate-500 font-medium">Item Total</span><span className="text-sm font-bold text-slate-800">{currencySymbol}{formPrice.toLocaleString()} <span className="text-slate-400 text-xs font-normal">x {formQty} =</span> {currencySymbol}{formTotal.toLocaleString()}</span></div>}
                        <div><Label>Notes</Label><Input value={form.notes} onChange={handleFormChange} name="notes" placeholder="Brand, Size, etc." className="h-11" /></div>
                        <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">Add to List</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT DIALOG */}
            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>{editingItem && <EditShoppingItemForm item={editingItem} onUpdate={handleUpdateItem} onClose={() => setEditingItem(null)} currencySymbol={currencySymbol} />}</Dialog>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}><DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Rename List</DialogTitle></DialogHeader><div className="flex gap-2 py-2"><Input value={listSettings.name} onChange={e => setListSettings({ ...listSettings, name: e.target.value })} className="h-11" /><Button onClick={handleRenameList}>Save</Button></div></DialogContent></Dialog>

            {isBulkMode && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5"><span className="font-bold text-sm whitespace-nowrap">{selectedItems.length} selected</span><div className="h-4 w-[1px] bg-slate-700"></div><button onClick={handleBulkComplete} className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Done</button><button onClick={() => setDeleteConfirm({ isOpen: true, type: 'bulk' })} className="text-rose-400 font-medium flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button><button onClick={() => setSelectedItems([])} className="text-slate-400 ml-2">Cancel</button></div>}

            {/* ALERT DIALOG */}
            <AlertDialog isOpen={alertInfo.isOpen} onOpenChange={(o) => setAlertInfo({ ...alertInfo, isOpen: o })} title={alertInfo.title} description={alertInfo.desc} />

            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Delete?" description="Irreversible." onConfirm={handleDelete} />
        </Card>
    )
}

function EditShoppingItemForm({ item, onUpdate, onClose, currencySymbol }: { item: ShoppingItem, onUpdate: (item: any) => void, onClose: () => void, currencySymbol: string }) {
    const [form, setForm] = useState({ name: item.name, quantity: item.quantity || "1", price: item.price?.toString() || "", notes: item.notes || "", priority: item.priority || "Medium" });
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); onUpdate(form); };
    return (
        <DialogContent className="sm:max-w-md rounded-2xl"><DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-4 gap-3"><div className="col-span-3"><Label>Item Name</Label><Input value={form.name} onChange={handleChange} name="name" className="h-11" /></div><div className="col-span-1"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={handleChange} name="quantity" className="h-11 text-center" /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Price ({currencySymbol})</Label><Input type="number" value={form.price} onChange={handleChange} name="price" className="h-11" /></div>
            <div>
                <Label>Priority</Label>
                <Select value={form.priority as any} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </div>
        </div><div><Label>Notes</Label><Input value={form.notes} onChange={handleChange} name="notes" className="h-11" /></div><DialogFooter><Button type="submit" className="w-full h-11 bg-blue-600">Save Changes</Button></DialogFooter></form></DialogContent>
    )
}