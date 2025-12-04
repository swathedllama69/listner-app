"use client"

import { useState, useEffect, FormEvent, useRef } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase" // ⚡ REAL IMPORT
import { User } from "@supabase/supabase-js" // ⚡ REAL TYPE IMPORT
import { Capacitor } from "@capacitor/core"
import { App as CapApp } from "@capacitor/app"
import { StatusBar, Style } from "@capacitor/status-bar"
import { PushNotifications } from "@capacitor/push-notifications"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Plus, UserPlus, Eye, EyeOff, Target, ShoppingCart, Lock, Trash2, Pencil, PiggyBank, X, Info, Wallet, ArrowLeft, Receipt, Loader2, ArrowDown, ListChecks, CheckCircle2, Goal, TrendingUp, ArrowDownRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// --- INLINE MOCKS FOR MISSING DEPENDENCIES (Keep these until you build the actual components) ---
// Note: If you have these components built, import them instead!

const SidebarLayout = ({ children, activeTab, setActiveTab }: { children: React.ReactNode, activeTab: string, setActiveTab: (t: string) => void, [key: string]: any }) => (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">{children}</div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-50">
            {['home', 'wishlist', 'shopping', 'finance', 'settings'].map((tab: string) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`p-2 rounded-lg capitalize text-xs font-bold flex flex-col items-center gap-1 transition-colors ${activeTab === tab ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
                    {tab}
                </button>
            ))}
        </div>
    </div>
);

// Child Components with flexible props
const ListDetail = (props: any) => (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-2">List Detail: {props.list.name}</h3>
        <p className="text-sm text-slate-500">List detail view placeholder.</p>
    </div>
);

const ShoppingList = (props: any) => (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Shopping List: {props.list.name}</h3>
        <p className="text-sm text-slate-500">Shopping list view placeholder.</p>
    </div>
);

const Finance = (props: any) => (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Finance Overview</h3>
        <p className="text-sm text-slate-500">Finance overview placeholder.</p>
    </div>
);

const HomeOverview = (props: any) => (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Home Overview</h3>
        <p className="text-sm text-slate-500">Home dashboard placeholder.</p>
    </div>
);

const OnboardingWizard = (props: any) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Onboarding Wizard</h3>
            <Button onClick={props.onComplete}>Complete Setup</Button>
        </div>
    </div>
);

const HouseholdSyncDialog = (props: any) => (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
        <DialogContent><DialogHeader><DialogTitle>Sync Household</DialogTitle></DialogHeader><p>Sync dialog placeholder.</p></DialogContent>
    </Dialog>
);

const SettingsView = (props: any) => (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Settings</h3>
        <p className="text-sm text-slate-500 mb-4">User: {props.user?.email}</p>
        <Button onClick={props.onSettingsChange}>Refresh App</Button>
    </div>
);

const NotificationBell = (props: any) => <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><span className="w-2 h-2 bg-red-500 rounded-full"></span></div>;

// --- TYPES ---
interface Household { id: string; name: string; currency?: string; country?: string; avatar_url?: string; invite_code?: string; }
interface List {
    id: string; name: string; household_id: string; owner_id: string; is_private: boolean; list_type: 'shopping' | 'wishlist'; created_at: string;
    pending_items?: number; estimated_cost?: number;
    active_goals?: number; target_amount?: number; saved_amount?: number;
    total_goals?: number; completed_goals?: number;
}

const EXPENSE_CATEGORIES = ["Groceries", "Rent/Mortgage", "Utilities", "Transport", "Subscriptions", "Personal", "Other"];
const getCurrencySymbol = (code: string) => code === "USD" ? "$" : "₦";

type ListWithSummary = List;

function ConfirmDialog({ isOpen, onOpenChange, title, description, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className="text-sm text-slate-500 py-2">{description}</div>
                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
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

// ⚡ PullToRefresh Component
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
            setPullDistance(dist > threshold ? threshold + (dist - threshold) * 0.3 : dist);
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= threshold) {
            setRefreshing(true);
            setPullDistance(threshold);
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

// --- ⚡ SUPER CREATE MENU ---
function CreateMenu({ isOpen, onOpenChange, context, user, household, onSuccess, currencySymbol, viewScope }: {
    isOpen: boolean, onOpenChange: (open: boolean) => void, context: string, user: User, household: Household, onSuccess: () => void, currencySymbol: string, viewScope: 'unified' | 'household' | 'solo'
}) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'menu' | 'expense' | 'shopping' | 'wishlist'>('menu');

    // Default scope based on viewScope
    const defaultScope = viewScope === 'solo' ? 'personal' : 'household';

    const [expForm, setExpForm] = useState({ name: '', amount: '', category: EXPENSE_CATEGORIES[0], scope: defaultScope });
    const [listForm, setListForm] = useState({ name: '', isPrivate: false, listType: 'shopping' as 'shopping' | 'wishlist' });

    // Set initial mode based on active tab
    useEffect(() => {
        if (isOpen) {
            if (context === 'finance') {
                setMode('expense');
            } else if (context === 'wishlist') {
                setMode('wishlist');
                setListForm(prev => ({ ...prev, listType: 'wishlist' }));
            } else if (context === 'shopping') {
                setMode('shopping');
                setListForm(prev => ({ ...prev, listType: 'shopping' }));
            } else {
                setMode('menu');
            }
        }
    }, [isOpen, context]);

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

    const handleList = async () => {
        setLoading(true);
        // ⚡ BUG FIX: Explicitly set type based on mode
        const actualListType = mode === 'wishlist' ? 'wishlist' : 'shopping';

        const { error } = await supabase.from('lists').insert({
            name: listForm.name,
            household_id: household.id,
            owner_id: user.id,
            is_private: listForm.isPrivate,
            list_type: actualListType
        });
        setLoading(false);
        if (!error) {
            setListForm({ name: '', isPrivate: false, listType: 'shopping' });
            onOpenChange(false);
            onSuccess();
        }
    };

    const renderMenu = () => (
        <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setMode('expense')} className="flex flex-col items-center justify-center p-4 bg-teal-50 hover:bg-teal-100 border-2 border-teal-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-teal-200 text-teal-700 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-300 transition-colors">
                    <Receipt className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-teal-800">Expense</span>
                <span className="text-[10px] text-teal-600">Log spending</span>
            </button>

            <button onClick={() => { setMode('shopping'); setListForm(prev => ({ ...prev, listType: 'shopping' })) }} className="flex flex-col items-center justify-center p-4 bg-lime-50 hover:bg-lime-100 border-2 border-lime-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-lime-200 text-lime-700 rounded-full flex items-center justify-center mb-2 group-hover:bg-lime-300 transition-colors">
                    <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-lime-800">Shopping List</span>
                <span className="text-[10px] text-lime-600">Plan purchases</span>
            </button>

            <button onClick={() => { setMode('wishlist'); setListForm(prev => ({ ...prev, listType: 'wishlist' })) }} className="col-span-2 flex flex-row items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-100 rounded-2xl transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center shrink-0 group-hover:bg-emerald-300 transition-colors">
                    <Target className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <span className="block text-sm font-bold text-emerald-900">Wishlist/Goals</span>
                    <span className="block text-[10px] text-emerald-700">Create a new collection</span>
                </div>
            </button>
        </div>
    );

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

        if (mode === 'shopping' || mode === 'wishlist') {
            const isWishlist = mode === 'wishlist';
            return (
                <div className="space-y-4 pt-1 animate-in slide-in-from-right-8 duration-200">
                    <div className={`p-3 rounded-xl border mb-2 ${isWishlist ? 'bg-emerald-50 border-emerald-100' : 'bg-lime-50 border-lime-100'}`}>
                        <p className={`text-xs leading-relaxed ${isWishlist ? 'text-emerald-800' : 'text-lime-800'}`}>
                            {isWishlist
                                ? "Create a new Goal Collection (Wishlist) to track savings and targets."
                                : "Create a new Shopping List for your household's active purchases."}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label>{mode === 'shopping' ? 'Shopping List Name' : 'Wishlist Name'}</Label>
                        <Input
                            placeholder={mode === 'shopping' ? "e.g. Monthly Groceries, Personal Care" : "e.g. Vacation Fund, House Redesign"}
                            value={listForm.name}
                            onChange={e => setListForm({ ...listForm, name: e.target.value })}
                            className="bg-slate-50 border-slate-200 h-11"
                        />
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Checkbox id="priv-check" checked={listForm.isPrivate} onCheckedChange={(c) => setListForm({ ...listForm, isPrivate: c as boolean })} />
                        <Label htmlFor="priv-check" className="text-sm font-medium text-slate-600">
                            {listForm.isPrivate ?
                                <span className="text-rose-600 font-bold">Private {mode === 'shopping' ? 'Shopping List' : 'Wishlist'}</span> :
                                <span className="text-emerald-600 font-bold">Household {mode === 'shopping' ? 'Shopping List (Shared)' : 'Wishlist (Shared)'}</span>
                            }
                        </Label>
                    </div>

                    <Button
                        onClick={() => handleList()}
                        className={`w-full h-12 text-base font-medium ${mode === 'shopping' ? 'bg-lime-600 hover:bg-lime-700 text-slate-900' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                        disabled={loading || !listForm.name}
                    >
                        {loading ? 'Creating...' : `Create ${mode === 'shopping' ? 'List' : 'Wishlist'}`}
                    </Button>
                </div>
            );
        }
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
                            {mode === 'menu'
                                ? 'Create New'
                                : mode === 'expense'
                                    ? 'Log Expense'
                                    : mode === 'shopping'
                                        ? 'New Shopping List'
                                        : 'New Wishlist Collection'
                            }
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

    useEffect(() => { onListSelected(!!selectedList) }, [selectedList, onListSelected])

    const fetchLists = async () => {
        setIsLoading(true)
        const { data, error } = await supabase.from("lists").select("*").eq("household_id", household.id).eq("list_type", listType).order("created_at", { ascending: true })
        if (error) { console.error(error); setIsLoading(false); return; }

        let finalLists: ListWithSummary[] = data as ListWithSummary[];
        const rpcName = listType === 'shopping' ? 'get_shopping_list_summaries' : 'get_wishlist_summaries';
        const { data: summaries } = await supabase.rpc(rpcName, { target_household_id: household.id });

        if (summaries) {
            const summaryMap = new Map(summaries.map((s: any) => [s.list_id, s]));
            finalLists = data.map((list: List) => {
                const s: any = summaryMap.get(list.id);
                return {
                    ...list,
                    pending_items: s?.total_pending_items || 0,
                    estimated_cost: s?.estimated_cost || 0,
                    active_goals: s?.total_active_goals || 0,
                    target_amount: s?.total_target_amount || 0,
                    saved_amount: s?.total_saved_amount || 0,
                    total_goals: s?.total_goals || 0,
                    completed_goals: s?.completed_goals || 0
                }
            });
        }
        setLists(finalLists);
        setIsLoading(false);
    };

    useEffect(() => { fetchLists() }, [household.id, listType, refreshTrigger]);

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

    const explainerContent = listType === 'shopping' ? {
        title: "Mastering Shopping Lists",
        icon: <ShoppingCart className="w-12 h-12 text-lime-600" />,
        text: (
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p><strong>1. Create Collections:</strong> Create lists like <em>"Monthly Groceries"</em> or <em>"Party Supplies"</em>.</p>
                <p><strong>2. Add Items:</strong> Open a list to add items, quantities and priorities.</p>
            </div>
        )
    } : {
        title: "Your Wishlists",
        icon: <Target className="w-12 h-12 text-emerald-600" />,
        text: (
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>This is your custom wish list collection. From <strong>personal wishlists</strong> to <strong>household wishlists</strong>.</p>
                <p>You can make lists <strong>Private</strong> for your eyes only, or <strong>Shared</strong> with the entire household.</p>
                <p>After creating a wishlist, you can add specific items or goals to track.</p>
            </div>
        )
    };

    if (selectedList) {
        return (
            <div className="w-full animate-in slide-in-from-right-4 fade-in duration-300">
                <Button variant="ghost" onClick={handleBack} className="mb-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl gap-2 pl-3 pr-4 font-bold shadow-sm hover:shadow-md transition-all border border-slate-200">
                    <ArrowLeft className="w-4 h-4" /> Back to Lists
                </Button>
                {listType === 'wishlist' ? <ListDetail user={user} list={selectedList} currencySymbol={currencySymbol} /> : <ShoppingList user={user} list={selectedList} currencySymbol={currencySymbol} />}
            </div>
        )
    }

    const grandTotalCost = lists.reduce((s, l) => s + (l.estimated_cost || 0), 0);
    const grandTotalItems = lists.reduce((s, l) => s + (l.pending_items || 0), 0);
    const grandTotalGoals = lists.reduce((s, l) => s + (l.total_goals || 0), 0);
    const grandTotalTarget = lists.reduce((s, l) => s + (l.target_amount || 0), 0);
    const grandTotalSaved = lists.reduce((s, l) => s + (l.saved_amount || 0), 0);
    const progress = grandTotalTarget > 0 ? (grandTotalSaved / grandTotalTarget) * 100 : 0;
    const grandTotalCompletedGoals = lists.reduce((s, l) => s + (l.completed_goals || 0), 0);
    const grandTotalUncompletedGoals = grandTotalGoals - grandTotalCompletedGoals;

    const getListIcon = (list: List) => {
        if (list.list_type === 'wishlist') {
            return list.is_private ? <Lock className="w-5 h-5" /> : <Target className="w-5 h-5" />;
        }
        return list.is_private ? <Lock className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />;
    };

    return (
        <div className="space-y-6">

            {lists.length === 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-lg animate-in fade-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                    <div className="flex flex-col items-center relative z-10">
                        <div className="bg-slate-50 p-4 rounded-full mb-3 border border-slate-100">
                            {explainerContent.icon}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{explainerContent.title}</h2>
                    </div>

                    <div className="text-left bg-slate-50/80 p-4 rounded-xl border border-slate-100 mt-4 relative z-10">
                        {explainerContent.text}
                    </div>

                    {/* ⚡ BOLD INSTRUCTION with ARROW */}
                    <div className="mt-6 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-2 duration-700 relative z-20">
                        <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                            <span>Use the</span>
                            <span className="bg-lime-400 text-slate-900 rounded-full p-0.5"><Plus className="w-3 h-3 stroke-[3]" /></span>
                            <span>button to create</span>
                        </p>
                        <ArrowDownRight className="w-6 h-6 text-lime-500 animate-bounce mt-1 drop-shadow-sm" />
                    </div>
                </div>
            )}

            {lists.length > 0 && (
                <>
                    {listType === 'shopping' ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-white/70 hover:bg-white"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items Pending</CardTitle><div className="text-2xl font-bold text-slate-800">{grandTotalItems.toLocaleString()}</div></Card>
                            <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-white/70 hover:bg-white"><CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Cost</CardTitle><div className="text-2xl font-bold text-lime-700">{currencySymbol}{grandTotalCost.toLocaleString()}</div></Card>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-emerald-50/50 hover:bg-emerald-100/50">
                                <CardHeader className="p-0 pb-1"><CardTitle className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><Goal className="w-3 h-3" /> All Goals</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="text-2xl font-bold text-emerald-800">{grandTotalGoals.toLocaleString()}</div>
                                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">({grandTotalUncompletedGoals} Active, {grandTotalCompletedGoals} Done)</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl shadow-sm border border-slate-100 p-4 bg-emerald-50/50 hover:bg-emerald-100/50">
                                <CardHeader className="p-0 pb-1"><CardTitle className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><PiggyBank className="w-3 h-3" /> Total Saved</CardTitle></CardHeader>
                                <CardContent className="p-0"><div className="text-2xl font-bold text-emerald-700 truncate">{currencySymbol}{grandTotalSaved.toLocaleString()}</div></CardContent>
                            </Card>

                            {/* ⚡ SHRUNK PROGRESS CARD */}
                            <Card className="col-span-2 rounded-2xl shadow-sm border border-slate-100 px-4 py-3 bg-emerald-50/50 hover:bg-emerald-100/50 flex flex-col justify-center">
                                <div className="flex justify-between items-center mb-1.5">
                                    <CardTitle className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Overall Progress</CardTitle>
                                    <span className="text-[10px] text-slate-500 font-medium">Target: {currencySymbol}{grandTotalTarget.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Progress value={progress} className="h-2 bg-emerald-100 flex-1" indicatorClassName="bg-emerald-500" />
                                    <span className="text-lg font-bold text-emerald-800">{Math.round(progress)}%</span>
                                </div>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {lists.length > 0 && <Separator className="my-2" />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lists.map(list => (
                    <div key={list.id} onClick={() => setSelectedList(list)} className={`group relative cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all ${listType === 'wishlist' ? 'hover:border-emerald-200' : 'hover:border-lime-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${listType === 'wishlist' ? 'bg-emerald-50 text-emerald-600' : 'bg-lime-50 text-lime-600'}`}>
                                {getListIcon(list)}
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-0 truncate flex-1">{list.name}</h3>

                            {/* ⚡ RED PADLOCK */}
                            {list.is_private && <Lock className="w-5 h-5 text-red-500 fill-red-50 stroke-[2.5]" />}
                        </div>

                        <div className="text-sm text-slate-500 font-medium mt-1 border-t border-slate-50 pt-2">
                            {listType === 'shopping' ?
                                <>
                                    <p className="text-xs text-slate-500">{list.pending_items} items pending</p>
                                    <p className="text-sm font-bold text-lime-700">{currencySymbol}{(list.estimated_cost || 0).toLocaleString()}</p>
                                </>
                                :
                                <>
                                    <p className="text-xs text-slate-500">{list.active_goals} active goals</p>
                                    <p className="text-sm font-bold text-emerald-700">{currencySymbol}{(list.saved_amount || 0).toLocaleString()} saved</p>
                                </>
                            }
                        </div>

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

    const [viewScope, setViewScope] = useState<'unified' | 'household' | 'solo'>('unified');
    const [dismissedExplainers, setDismissedExplainers] = useState<{ [key: string]: boolean }>({});

    const currencySymbol = getCurrencySymbol(household.currency || 'NGN');

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            StatusBar.setStyle({ style: Style.Light }).catch(() => { });
            // StatusBar.setOverlaysWebView({ overlay: false }).catch(() => { });
        }

        if (Capacitor.isNativePlatform()) {
            const setupListener = async () => {
                const { remove } = await CapApp.addListener('backButton', ({ canGoBack }: any) => {
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

        if (Capacitor.isNativePlatform()) {
            const initPush = async () => {
                try {
                    let permStatus = await PushNotifications.checkPermissions();
                    if (permStatus.receive === 'prompt') permStatus = await PushNotifications.requestPermissions();
                    if (permStatus.receive === 'granted') await PushNotifications.register();
                } catch (e) { console.error("Push Init Error:", e); }
            }
            initPush();
            PushNotifications.addListener('registration', async (token: any) => {
                await supabase.from('device_tokens').upsert({ user_id: user.id, token: token.value }, { onConflict: 'token' } as any);
            });
        }

        const savedPrivacy = localStorage.getItem("listner_privacy_mode");
        if (savedPrivacy === "true") setHideBalances(true);

        const savedExplainers = localStorage.getItem(`listner_explainers_${user.id}`);
        if (savedExplainers) setDismissedExplainers(JSON.parse(savedExplainers));

        async function fetchData() {
            const { count } = await supabase.from('household_members').select('*', { count: 'exact', head: true } as any).eq('household_id', household.id);
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
        await new Promise(resolve => setTimeout(resolve, 1000));
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

                <div className="pt-4 px-1 mb-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{activeTab === 'home' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                            {activeTab === 'home' && <p className="text-sm text-slate-500 font-medium">{getGreeting()}, {userName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <NotificationBell userId={user.id} onNavigate={(tab: string) => setActiveTab(tab)} />
                            <Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-slate-400 hover:bg-slate-100 rounded-full">
                                {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </Button>

                            <Button onClick={() => setIsSyncOpen(true)} size="sm" className="bg-lime-500 text-slate-900 rounded-full text-xs h-8 px-3 font-bold shadow-sm hover:bg-lime-600">
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Sync
                            </Button>
                        </div>
                    </div>

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

                            {!dismissedExplainers[viewScope] && (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex gap-3 items-start relative animate-in fade-in slide-in-from-top-2">
                                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-emerald-800 mb-0.5 capitalize">{viewScope} Mode</p>
                                        <p className="text-xs text-emerald-600 leading-tight">
                                            {viewScope === 'unified' && "You are seeing everything. Both shared household items and your private personal items."}
                                            {viewScope === 'household' && "Filtering for shared items only. These are visible to other household members."}
                                            {viewScope === 'solo' && "Filtering for your private items only. These are hidden from the household."}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDismissExplainer(viewScope)} className="text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
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