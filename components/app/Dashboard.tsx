"use client"

import { useState, useEffect, FormEvent, useRef } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Plus, UserPlus, Eye, EyeOff, Target, ShoppingCart, Lock, Trash2, Pencil, PiggyBank, X, Info, Wallet, ArrowLeft, Receipt, Loader2, ArrowDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarLayout } from "@/components/ui/SidebarLayout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { getCurrencySymbol, EXPENSE_CATEGORIES } from "@/lib/constants"
import { Separator } from "@/components/ui/separator"
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

// Import sibling components
import { ListDetail } from "@/components/app/ListDetail"
import { ShoppingList } from "@/components/app/ShoppingList"
import { Finance } from "@/components/app/Finance"
import { HomeOverview } from "@/components/app/HomeOverview"
import { OnboardingWizard } from "@/components/app/OnboardingWizard"
import { HouseholdSyncDialog } from "@/components/app/HouseholdSyncDialog"
import { SettingsView } from "@/components/app/SettingsView"
import { NotificationBell } from "@/components/app/NotificationBell"
import { Household, List } from "@/lib/types"

// --- TYPES ---
type ListWithSummary = List & { pending_items?: number; estimated_cost?: number; active_goals?: number; target_amount?: number; saved_amount?: number; };
type ListSummary = { list_id: string; total_pending_items?: number; estimated_cost?: number; total_active_goals?: number; total_target_amount?: number; total_saved_amount?: number; };

// --- HELPER COMPONENTS ---

function ConfirmDialog({ isOpen, onOpenChange, title, description, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="text-sm text-slate-500 py-2">{description}</div><DialogFooter className="flex gap-2 sm:justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm</Button></DialogFooter></DialogContent>
        </Dialog>
    )
}

function PortalFAB({ onClick, className, icon: Icon }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] animate-in zoom-in duration-300">
            <Button onClick={onClick} className={`${className} shadow-2xl border-4 border-white/20 active:scale-90 transition-transform`}>
                <Icon className="w-8 h-8" />
            </Button>
        </div>,
        document.body
    );
}

// ⚡ NEW: PullToRefresh Component
function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>, children: React.ReactNode }) {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const threshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY > 0 && window.scrollY === 0) {
            const currentY = e.touches[0].clientY;
            const dist = Math.max(0, currentY - startY);
            // Resistance effect
            setPullDistance(dist > threshold ? threshold + (dist - threshold) * 0.3 : dist);
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= threshold) {
            setRefreshing(true);
            setPullDistance(threshold); // Lock at threshold while refreshing
            await onRefresh();
            setRefreshing(false);
        }
        setStartY(0);
        setPullDistance(0);
    };

    return (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div style={{ height: pullDistance, transition: refreshing ? 'height 0.2s' : 'none' }} className="w-full overflow-hidden flex items-center justify-center bg-slate-50">
                <div className={`transition-transform ${pullDistance > threshold / 2 ? 'rotate-180' : ''}`}>
                    {refreshing ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <ArrowDown className="w-6 h-6 text-slate-400" />}
                </div>
            </div>
            {children}
        </div>
    );
}

// --- ⚡ SUPER CREATE MENU (Context Aware) ---
function CreateMenu({ isOpen, onOpenChange, context, user, household, onSuccess, currencySymbol, viewScope }: {
    isOpen: boolean, onOpenChange: (open: boolean) => void, context: string, user: User, household: Household, onSuccess: () => void, currencySymbol: string, viewScope: 'unified' | 'household' | 'solo'
}) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'menu' | 'expense' | 'shopping' | 'wishlist'>('menu');

    // Set initial mode based on active tab
    useEffect(() => {
        if (isOpen) {
            if (context === 'finance') setMode('expense');
            else if (context === 'shopping') setMode('shopping');
            else if (context === 'wishlist') setMode('wishlist');
            else setMode('menu'); // Default for Home/Settings
        }
    }, [isOpen, context]);

    // Default scope based on viewScope
    const defaultScope = viewScope === 'solo' ? 'personal' : 'household';

    const [expForm, setExpForm] = useState({ name: '', amount: '', category: EXPENSE_CATEGORIES[0], scope: defaultScope });
    const [listForm, setListForm] = useState({ name: '', isPrivate: false });

    // Keep form scope in sync if view changes
    useEffect(() => {
        setExpForm(prev => ({ ...prev, scope: viewScope === 'solo' ? 'personal' : 'household' }));
    }, [viewScope]);

    const handleExpense = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true);
        const { error } = await supabase.from('expenses').insert({
            user_id: user.id,
            household_id: household.id,
            name: expForm.name,
            amount: parseFloat(expForm.amount),
            category: expForm.category,
            scope: expForm.scope,
            expense_date: new Date().toISOString(),
        });
        setLoading(false);
        if (!error) {
            setExpForm({ name: '', amount: '', category: EXPENSE_CATEGORIES[0], scope: defaultScope });
            onOpenChange(false);
            onSuccess();
        }
    };

    const handleList = async (type: 'shopping' | 'wishlist') => {
        setLoading(true);
        const { error } = await supabase.from('lists').insert({ name: listForm.name, household_id: household.id, owner_id: user.id, is_private: listForm.isPrivate, list_type: type });
        setLoading(false); if (!error) { setListForm({ name: '', isPrivate: false }); onOpenChange(false); onSuccess(); }
    };

    // Render the Grid Menu
    const renderMenu = () => (
        <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setMode('expense')} className="flex flex-col items-center justify-center p-4 bg-teal-50 hover:bg-teal-100 border-2 border-teal-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-teal-200 text-teal-700 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-300 transition-colors">
                    <Receipt className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-teal-800">Expense</span>
                <span className="text-[10px] text-teal-600">Log spending</span>
            </button>

            <button onClick={() => setMode('shopping')} className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-300 transition-colors">
                    <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-blue-800">Shopping List</span>
                <span className="text-[10px] text-blue-600">Plan purchases</span>
            </button>

            <button onClick={() => setMode('wishlist')} className="col-span-2 flex flex-row items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center shrink-0 group-hover:bg-purple-300 transition-colors">
                    <Target className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <span className="block text-sm font-bold text-purple-800">New Goal</span>
                    <span className="block text-[10px] text-purple-600">Save for something big</span>
                </div>
            </button>
        </div>
    );

    // Render Forms with Contextual Explainers
    const renderForm = () => {
        if (mode === 'expense') return (
            <form onSubmit={handleExpense} className="space-y-4 pt-1 animate-in slide-in-from-right-8 duration-200">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                    <button type="button" onClick={() => setExpForm({ ...expForm, scope: 'household' })} className={`flex-1 text-xs py-2 rounded-lg transition-all ${expForm.scope === 'household' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-400'}`}>Household</button>
                    <button type="button" onClick={() => setExpForm({ ...expForm, scope: 'personal' })} className={`flex-1 text-xs py-2 rounded-lg transition-all ${expForm.scope === 'personal' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-400'}`}>Personal</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Amount</Label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 text-sm">{currencySymbol}</span><Input type="number" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required className="pl-7 bg-slate-50 border-slate-200 h-11" /></div></div>
                    <div className="space-y-1"><Label>Category</Label><Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}><SelectTrigger className="bg-slate-50 border-slate-200 h-11"><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-1"><Label>What was it?</Label><Input placeholder="e.g. Weekly Groceries" value={expForm.name} onChange={e => setExpForm({ ...expForm, name: e.target.value })} required className="bg-slate-50 border-slate-200 h-11" /></div>
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-base font-medium" disabled={loading}>{loading ? 'Saving...' : 'Log Expense'}</Button>
            </form>
        );

        if (mode === 'shopping' || mode === 'wishlist') return (
            <div className="space-y-4 pt-1 animate-in slide-in-from-right-8 duration-200">
                {/* ⚡ NEW: Explainers for creation */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {mode === 'wishlist'
                            ? "Create a new collection for your goals. This list will contain specific items (e.g. Laptop, Furniture) you want to save for."
                            : "Create a new shopping list for recurring needs or specific events."}
                    </p>
                </div>

                <div className="space-y-1">
                    <Label>{mode === 'shopping' ? 'List Name' : 'Collection Name'}</Label>
                    <Input
                        placeholder={mode === 'shopping' ? "e.g. Monthly Groceries, Personal Care" : "e.g. House Redesign, Personal Wishlist"}
                        value={listForm.name}
                        onChange={e => setListForm({ ...listForm, name: e.target.value })}
                        className="bg-slate-50 border-slate-200 h-11"
                    />
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Checkbox id="priv-check" checked={listForm.isPrivate} onCheckedChange={(c) => setListForm({ ...listForm, isPrivate: c as boolean })} />
                    <Label htmlFor="priv-check" className="text-sm font-medium text-slate-600">Keep this list private (Only me)</Label>
                </div>
                <Button onClick={() => handleList(mode)} className={`w-full h-12 text-base font-medium ${mode === 'shopping' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`} disabled={loading || !listForm.name}>{loading ? 'Creating...' : 'Create List'}</Button>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6 gap-0">
                <DialogHeader className="mb-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        {mode !== 'menu' && (
                            <Button variant="ghost" size="icon" onClick={() => setMode('menu')} className="h-8 w-8 -ml-2 rounded-full hover:bg-slate-100">
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </Button>
                        )}
                        <DialogTitle className="text-xl font-bold text-slate-800">
                            {mode === 'menu' ? 'Create New' : mode === 'expense' ? 'Log Expense' : mode === 'shopping' ? 'New Shopping List' : 'New Goal'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {mode === 'menu' ? renderMenu() : renderForm()}

            </DialogContent>
        </Dialog>
    )
}

// --- LIST MANAGER ---
function ListManager({ user, household, listType, onListSelected, currencySymbol, refreshTrigger }: { user: User, household: Household, listType: 'wishlist' | 'shopping', onListSelected: (isSelected: boolean) => void, currencySymbol: string, refreshTrigger: number }) {
    const [lists, setLists] = useState<ListWithSummary[]>([])
    const [selectedList, setSelectedList] = useState<List | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string } | null>(null)
    const [showExplainer, setShowExplainer] = useState(false); // ⚡ State for explainer dialog

    useEffect(() => { onListSelected(!!selectedList) }, [selectedList, onListSelected])

    const fetchLists = async () => {
        setIsLoading(true)
        const { data, error } = await supabase.from("lists").select("*").eq("household_id", household.id).eq("list_type", listType).order("created_at", { ascending: true })
        if (error) { console.error(error); setIsLoading(false); return; }

        let finalLists: ListWithSummary[] = data as ListWithSummary[];
        const rpcName = listType === 'shopping' ? 'get_shopping_list_summaries' : 'get_wishlist_summaries';
        const { data: summaries } = await supabase.rpc(rpcName, { target_household_id: household.id });

        if (summaries) {
            const summaryMap = new Map(summaries.map((s: ListSummary) => [s.list_id, s]));
            finalLists = data.map((list: List) => {
                const s: any = summaryMap.get(list.id);
                return { ...list, pending_items: s?.total_pending_items || 0, estimated_cost: s?.estimated_cost || 0, active_goals: s?.total_active_goals || 0, target_amount: s?.total_target_amount || 0, saved_amount: s?.total_saved_amount || 0 }
            });
        }
        setLists(finalLists);
        setIsLoading(false);
    };

    useEffect(() => { fetchLists() }, [household.id, listType, refreshTrigger]);

    // ⚡ Auto-Show Explainer if empty
    useEffect(() => {
        if (!isLoading && lists.length === 0) {
            const timer = setTimeout(() => setShowExplainer(true), 2000); // 2s delay as requested
            return () => clearTimeout(timer);
        }
    }, [isLoading, lists.length]);

    const handleUpdateList = (updated: List) => setLists(lists.map(l => l.id === updated.id ? { ...l, ...updated } : l));
    const handleDeleteList = async () => {
        if (!deleteConfirm) return;
        await supabase.from('lists').delete().eq('id', deleteConfirm.id);
        setLists(lists.filter(l => l.id !== deleteConfirm.id));
        setDeleteConfirm(null);
    }

    const handleBack = () => {
        setSelectedList(null);
        fetchLists();
    }

    // Explainer Content
    const explainerContent = listType === 'shopping' ? {
        title: "Mastering Shopping Lists",
        icon: <ShoppingCart className="w-12 h-12 text-blue-500" />,
        text: (
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p><strong>1. Create Collections:</strong> Instead of one giant list, create specific lists like <em>"Monthly Groceries"</em>, <em>"Party Supplies"</em>, or <em>"Hardware Store"</em>.</p>
                <p><strong>2. Add Items:</strong> Open a list to add items. You can set quantities and priorities.</p>
                <p><strong>3. Collaborate:</strong> By default, lists are shared with your household. Toggle <strong>Private</strong> inside the list settings if it's just for you.</p>
            </div>
        )
    } : {
        title: "Using Wishlists",
        icon: <Target className="w-12 h-12 text-purple-500" />,
        text: (
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p><strong>1. Set Goals:</strong> Create a collection for things you want to save for, like <em>"New Laptop"</em> or <em>"Vacation Fund"</em>.</p>
                <p><strong>2. Track Progress:</strong> Add specific items with prices. Mark contributions as you save money towards them.</p>
                <p><strong>3. Shared or Solo:</strong> Planning a surprise? Make the list <strong>Private</strong>. Saving for a couch? Keep it <strong>Shared</strong>.</p>
            </div>
        )
    };

    if (selectedList) {
        return (
            <div className="w-full animate-in slide-in-from-right-4 fade-in duration-300">
                {/* ⚡ UPDATED: Colorful Back Button */}
                <Button variant="ghost" onClick={handleBack} className="mb-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl gap-2 pl-3 pr-4 font-bold shadow-sm hover:shadow-md transition-all">
                    <ArrowLeft className="w-4 h-4" /> Back to Lists
                </Button>
                {listType === 'wishlist' ? <ListDetail user={user} list={selectedList} currencySymbol={currencySymbol} /> : <ShoppingList user={user} list={selectedList} currencySymbol={currencySymbol} />}
            </div>
        )
    }

    const grandTotalCost = lists.reduce((s, l) => s + (l.estimated_cost || 0), 0);
    const grandTotalItems = lists.reduce((s, l) => s + (l.pending_items || 0), 0);
    const grandTotalGoals = lists.reduce((s, l) => s + (l.active_goals || 0), 0);
    const grandTotalTarget = lists.reduce((s, l) => s + (l.target_amount || 0), 0);
    const grandTotalSaved = lists.reduce((s, l) => s + (l.saved_amount || 0), 0);
    const progress = grandTotalTarget > 0 ? (grandTotalSaved / grandTotalTarget) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* ⚡ Info Button Header */}
            <div className="flex justify-between items-center -mb-2">
                <div></div> {/* Spacer */}
                {lists.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowExplainer(true)} className="text-slate-400 hover:text-indigo-600 h-6 px-2 text-[10px] uppercase font-bold gap-1">
                        <Info className="w-3 h-3" /> How it works
                    </Button>
                )}
            </div>

            {listType === 'shopping' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="rounded-2xl shadow-sm border border-slate-100 p-4"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items Pending</CardTitle><div className="text-2xl font-bold text-slate-800">{grandTotalItems.toLocaleString()}</div></Card>
                    <Card className="rounded-2xl shadow-sm border border-slate-100 p-4"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Cost</CardTitle><div className="text-2xl font-bold text-emerald-700">{currencySymbol}{grandTotalCost.toLocaleString()}</div></Card>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-white">
                        <CardHeader className="p-0 pb-1"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Target className="w-3 h-3" /> Active Goals</CardTitle></CardHeader>
                        <CardContent className="p-0"><div className="text-2xl font-bold text-slate-800">{grandTotalGoals.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-white">
                        <CardHeader className="p-0 pb-1"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><PiggyBank className="w-3 h-3" /> Total Saved</CardTitle></CardHeader>
                        <CardContent className="p-0"><div className="text-2xl font-bold text-purple-700 truncate">{currencySymbol}{grandTotalSaved.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="col-span-2 rounded-2xl shadow-sm border border-slate-100 p-4 bg-white">
                        <CardHeader className="p-0 pb-2"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Progress</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="flex justify-between items-end mb-1.5">
                                <div className="text-2xl font-bold text-slate-800">{Math.round(progress)}%</div>
                                <span className="text-[10px] text-slate-400 mb-1 font-medium">Goal: {currencySymbol}{grandTotalTarget.toLocaleString()}</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-purple-100" />
                        </CardContent>
                    </Card>
                </div>
            )}

            <Separator className="my-2" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lists.map(list => (
                    <div key={list.id} onClick={() => setSelectedList(list)} className="group relative cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-100 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2 rounded-xl ${listType === 'wishlist' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{listType === 'wishlist' ? <Target className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}</div>
                            {/* ⚡ UPDATED: Red Bold Lock */}
                            {list.is_private && <Lock className="w-4 h-4 text-rose-500 stroke-[3]" />}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{list.name}</h3>
                        <div className="text-sm text-slate-500 font-medium">{listType === 'shopping' ? `${list.pending_items} items • ${currencySymbol}${(list.estimated_cost || 0).toLocaleString()}` : `${list.active_goals} goals • ${currencySymbol}${(list.saved_amount || 0).toLocaleString()} saved`}</div>

                        {list.owner_id === user.id && (
                            <div className="absolute top-4 right-4 flex gap-2 bg-white shadow-sm rounded-lg p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                <EditListDialog list={list} onListUpdated={handleUpdateList} />
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: list.id }) }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Delete List?" description="This action cannot be undone." onConfirm={handleDeleteList} />

            {/* ⚡ Explainer Dialog */}
            <Dialog open={showExplainer} onOpenChange={setShowExplainer}>
                <DialogContent className="sm:max-w-sm rounded-2xl text-center">
                    <DialogHeader className="flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">{explainerContent.icon}</div>
                        <DialogTitle className="text-xl font-bold text-slate-800">{explainerContent.title}</DialogTitle>
                    </DialogHeader>
                    <div className="text-left bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {explainerContent.text}
                    </div>
                    <Button onClick={() => setShowExplainer(false)} className="w-full mt-2 bg-slate-900 rounded-xl">Got it!</Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EditListDialog({ list, onListUpdated }: { list: List, onListUpdated: (list: List) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState(list.name)
    const [isPrivate, setIsPrivate] = useState(list.is_private)
    const handleSubmit = async (e: FormEvent) => { e.preventDefault(); const { data, error } = await supabase.from("lists").update({ name, is_private: isPrivate }).eq("id", list.id).select().single(); if (error) alert(error.message); else { onListUpdated(data as List); setIsOpen(false); } }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-400" /></Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit List</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-5 pt-2"><div><Label>List Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" /></div><div className="space-y-2"><Label>Visibility</Label><div className="flex gap-3 pt-1"><Button type="button" onClick={() => setIsPrivate(false)} className={`flex-1 ${!isPrivate ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Shared</Button><Button type="button" onClick={() => setIsPrivate(true)} className={`flex-1 ${isPrivate ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Private</Button></div></div><DialogFooter><Button type="submit" className="w-full h-11 bg-slate-900">Save Changes</Button></DialogFooter></form></DialogContent></Dialog>
    )
}


// === MAIN DASHBOARD ===
export function Dashboard({ user, household }: { user: User, household: Household & { currency?: string, country?: string, avatar_url?: string } }) {
    const [memberCount, setMemberCount] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<string>("home");
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isListDetailActive, setIsListDetailActive] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [hideBalances, setHideBalances] = useState(false);

    // ⚡ NEW: SCOPE STATE
    const [viewScope, setViewScope] = useState<'unified' | 'household' | 'solo'>('unified');
    const [dismissedExplainers, setDismissedExplainers] = useState<{ [key: string]: boolean }>({});

    const currencySymbol = getCurrencySymbol(household.currency || 'NGN');

    useEffect(() => {
        // 1. Status Bar Fix
        if (Capacitor.isNativePlatform()) {
            StatusBar.setStyle({ style: Style.Light }).catch(() => { });
            StatusBar.setOverlaysWebView({ overlay: false }).catch(() => { });
        }

        // 2. Back Button Support (Updated)
        if (Capacitor.isNativePlatform()) {
            const setupListener = async () => {
                const { remove } = await CapApp.addListener('backButton', ({ canGoBack }) => {
                    if (isListDetailActive) {
                        setIsListDetailActive(false);
                    } else if (isFabOpen) {
                        setIsFabOpen(false);
                    } else if (activeTab !== 'home') {
                        setActiveTab('home');
                    } else {
                        CapApp.exitApp();
                    }
                });
                return remove;
            };
            const listenerPromise = setupListener();
            return () => { listenerPromise.then(remove => remove && remove()); };
        }

        // 3. Push Notifications
        if (Capacitor.isNativePlatform()) {
            const initPush = async () => {
                try {
                    let permStatus = await PushNotifications.checkPermissions();
                    if (permStatus.receive === 'prompt') permStatus = await PushNotifications.requestPermissions();
                    if (permStatus.receive === 'granted') await PushNotifications.register();
                } catch (e) { console.error("Push Init Error:", e); }
            }
            initPush();
            PushNotifications.addListener('registration', async (token) => {
                await supabase.from('device_tokens').upsert({ user_id: user.id, token: token.value }, { onConflict: 'token' });
            });
        }

        const savedPrivacy = localStorage.getItem("listner_privacy_mode");
        if (savedPrivacy === "true") setHideBalances(true);

        // Load dismissed explainers
        const savedExplainers = localStorage.getItem(`listner_explainers_${user.id}`);
        if (savedExplainers) setDismissedExplainers(JSON.parse(savedExplainers));

        async function fetchData() {
            const { count } = await supabase.from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', household.id);
            if (count !== null) setMemberCount(count);
        }
        fetchData();

        if (!user.user_metadata?.onboarding_complete) setShowOnboarding(true);

    }, [household.id, user, isListDetailActive, isFabOpen, activeTab]);

    const handleDismissExplainer = (scope: string) => {
        const newState = { ...dismissedExplainers, [scope]: true };
        setDismissedExplainers(newState);
        localStorage.setItem(`listner_explainers_${user.id}`, JSON.stringify(newState));
    }

    const togglePrivacy = () => {
        const newVal = !hideBalances;
        setHideBalances(newVal);
        localStorage.setItem("listner_privacy_mode", String(newVal));
    }

    const handleGlobalRefresh = async () => {
        setRefreshKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for effect
    };
    const handleOnboardingComplete = () => {
        localStorage.setItem(`tutorial_seen_${user.id}`, "true");
        setShowOnboarding(false);
        window.location.reload();
    }

    const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
    const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0];

    return (
        <SidebarLayout user={user} household={household} memberCount={memberCount} activeTab={activeTab} setActiveTab={setActiveTab}>
            <div className="w-full pb-24 relative">

                {/* ⚡ HEADER: Updated for Sync & Toggles */}
                <div className="pt-4 px-1 mb-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{activeTab === 'home' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                            {activeTab === 'home' && <p className="text-sm text-slate-500 font-medium">{getGreeting()}, {userName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationBell userId={user.id} onNavigate={(tab) => setActiveTab(tab)} />
                            <Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-slate-400 hover:bg-slate-100 rounded-full">
                                {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </Button>

                            {/* ⚡ UPDATED: Sync Button */}
                            <Button onClick={() => setIsSyncOpen(true)} size="sm" className="bg-violet-600 text-white rounded-full text-xs h-8 px-3 font-bold shadow-sm hover:bg-violet-700">
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Sync
                            </Button>
                        </div>
                    </div>

                    {/* ⚡ NEW: SCOPE TOGGLE & EXPLAINER (For Home & Finance) */}
                    {(activeTab === 'home' || activeTab === 'finance') && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                                {['unified', 'household', 'solo'].map((scope) => (
                                    <button
                                        key={scope}
                                        onClick={() => setViewScope(scope as any)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${viewScope === scope ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {scope}
                                    </button>
                                ))}
                            </div>

                            {/* Dismissible Explainer */}
                            {!dismissedExplainers[viewScope] && (
                                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex gap-3 items-start relative animate-in fade-in slide-in-from-top-2">
                                    <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-indigo-800 mb-0.5 capitalize">{viewScope} Mode</p>
                                        <p className="text-xs text-indigo-600 leading-tight">
                                            {viewScope === 'unified' && "You are seeing everything. Both shared household items and your private personal items."}
                                            {viewScope === 'household' && "Filtering for shared items only. These are visible to other household members."}
                                            {viewScope === 'solo' && "Filtering for your private items only. These are hidden from the household."}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDismissExplainer(viewScope)} className="text-indigo-400 hover:text-indigo-600"><X className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <PullToRefresh onRefresh={handleGlobalRefresh}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsContent value="home" className="animate-in fade-in duration-300">
                            <HomeOverview
                                user={user}
                                household={household}
                                currencySymbol={currencySymbol}
                                hideBalances={hideBalances}
                                refreshTrigger={refreshKey}
                                viewScope={viewScope}
                            />
                        </TabsContent>

                        <TabsContent value="wishlist" className="animate-in fade-in duration-300">
                            <ListManager
                                user={user}
                                household={household}
                                listType="wishlist"
                                onListSelected={setIsListDetailActive}
                                currencySymbol={currencySymbol}
                                refreshTrigger={refreshKey}
                            />
                        </TabsContent>

                        <TabsContent value="shopping" className="animate-in fade-in duration-300">
                            <ListManager
                                user={user}
                                household={household}
                                listType="shopping"
                                onListSelected={setIsListDetailActive}
                                currencySymbol={currencySymbol}
                                refreshTrigger={refreshKey}
                            />
                        </TabsContent>

                        <TabsContent value="finance" className="animate-in fade-in duration-300">
                            <Finance
                                user={user}
                                household={household}
                                currencySymbol={currencySymbol}
                                hideBalances={hideBalances}
                                refreshTrigger={refreshKey}
                                viewScope={viewScope}
                            />
                        </TabsContent>

                        <TabsContent value="settings" className="animate-in fade-in duration-300">
                            <SettingsView user={user} household={household} onSettingsChange={handleGlobalRefresh} />
                        </TabsContent>
                    </Tabs>
                </PullToRefresh>

                {!isListDetailActive && activeTab !== 'settings' && (
                    <PortalFAB onClick={() => setIsFabOpen(true)} className={`h-16 w-16 rounded-full shadow-2xl bg-lime-400 hover:bg-lime-500 text-slate-900 flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:rotate-90 duration-300`} icon={Plus} />
                )}

                {showOnboarding && <OnboardingWizard user={user} household={household} onComplete={handleOnboardingComplete} />}

                {/* ⚡ UPGRADED MENU with Context */}
                <CreateMenu
                    isOpen={isFabOpen}
                    onOpenChange={setIsFabOpen}
                    context={activeTab}
                    user={user}
                    household={household}
                    onSuccess={handleGlobalRefresh}
                    currencySymbol={currencySymbol}
                    viewScope={viewScope}
                />

                <HouseholdSyncDialog
                    isOpen={isSyncOpen}
                    onOpenChange={setIsSyncOpen}
                    householdId={household.id}
                    userId={user.id}
                    onJoinSuccess={() => window.location.reload()}
                />
            </div>
        </SidebarLayout>
    )
}