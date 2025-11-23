"use client"

import { useState, useEffect, FormEvent } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Plus, UserPlus, Eye, EyeOff, Target, ShoppingCart, Lock, Trash2, Pencil, PiggyBank, Wallet } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarLayout } from "@/components/ui/SidebarLayout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { getCurrencySymbol, EXPENSE_CATEGORIES } from "@/lib/constants"
import { Separator } from "@/components/ui/separator"

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
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100]">
            <Button onClick={onClick} className={`${className} shadow-2xl border-2 border-white/20`}>
                <Icon className="w-7 h-7" />
            </Button>
        </div>,
        document.body
    );
}

// --- CONTEXTUAL CREATE DIALOG ---
function ContextualCreateDialog({ isOpen, onOpenChange, context, user, household, onSuccess, currencySymbol }: {
    isOpen: boolean, onOpenChange: (open: boolean) => void, context: string, user: User, household: Household, onSuccess: () => void, currencySymbol: string
}) {
    const [loading, setLoading] = useState(false);

    // Determine default tab based on context (activeTab from Dashboard)
    let defaultTab = "expense";
    if (context === "shopping") defaultTab = "shopping";
    if (context === "wishlist") defaultTab = "wishlist";

    const [expForm, setExpForm] = useState({ name: '', amount: '', category: EXPENSE_CATEGORIES[0] });
    const [listForm, setListForm] = useState({ name: '', isPrivate: false });

    const handleExpense = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true);
        const { error } = await supabase.from('expenses').insert({ user_id: user.id, household_id: household.id, name: expForm.name, amount: parseFloat(expForm.amount), category: expForm.category, expense_date: new Date().toISOString(), });
        setLoading(false); if (!error) { setExpForm({ name: '', amount: '', category: EXPENSE_CATEGORIES[0] }); onOpenChange(false); onSuccess(); }
    };
    const handleList = async (type: 'shopping' | 'wishlist') => {
        setLoading(true);
        const { error } = await supabase.from('lists').insert({ name: listForm.name, household_id: household.id, owner_id: user.id, is_private: listForm.isPrivate, list_type: type });
        setLoading(false); if (!error) { setListForm({ name: '', isPrivate: false }); onOpenChange(false); onSuccess(); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md top-[20%] translate-y-0 rounded-2xl">
                <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Quick Create</DialogTitle></DialogHeader>
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4"><TabsTrigger value="expense">Expense</TabsTrigger><TabsTrigger value="shopping">Shopping</TabsTrigger><TabsTrigger value="wishlist">Wishlist</TabsTrigger></TabsList>
                    <TabsContent value="expense">
                        <form onSubmit={handleExpense} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3"><Input type="number" placeholder={`Amount (${currencySymbol})`} value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required className="bg-slate-50 border-slate-200" /><Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}><SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            <Input placeholder="Description" value={expForm.name} onChange={e => setExpForm({ ...expForm, name: e.target.value })} required className="bg-slate-50 border-slate-200" />
                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>{loading ? 'Saving...' : 'Log Expense'}</Button>
                        </form>
                    </TabsContent>
                    <TabsContent value="shopping">
                        <div className="space-y-3 pt-2"><div className="flex gap-2"><Input placeholder="List Name (e.g. Weekly Groceries)" value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} className="bg-slate-50 border-slate-200" /><Button onClick={() => handleList('shopping')} className="bg-blue-600 hover:bg-blue-700" disabled={loading || !listForm.name}>Create</Button></div><div className="flex items-center space-x-2"><Checkbox id="priv-shop" checked={listForm.isPrivate} onCheckedChange={(c) => setListForm({ ...listForm, isPrivate: c as boolean })} /><Label htmlFor="priv-shop" className="text-sm">Make Private (Only me)</Label></div></div>
                    </TabsContent>
                    <TabsContent value="wishlist">
                        <div className="space-y-3 pt-2"><div className="flex gap-2"><Input placeholder="Wishlist Name (e.g. Holiday Fund)" value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} className="bg-slate-50 border-slate-200" /><Button onClick={() => handleList('wishlist')} className="bg-purple-600 hover:bg-purple-700" disabled={loading || !listForm.name}>Create</Button></div><div className="flex items-center space-x-2"><Checkbox id="priv-wish" checked={listForm.isPrivate} onCheckedChange={(c) => setListForm({ ...listForm, isPrivate: c as boolean })} /><Label htmlFor="priv-wish" className="text-sm">Make Private (Only me)</Label></div></div>
                    </TabsContent>
                </Tabs>
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
            const summaryMap = new Map(summaries.map((s: ListSummary) => [s.list_id, s]));
            finalLists = data.map((list: List) => {
                const s: any = summaryMap.get(list.id);
                return { ...list, pending_items: s?.total_pending_items || 0, estimated_cost: s?.estimated_cost || 0, active_goals: s?.total_active_goals || 0, target_amount: s?.total_target_amount || 0, saved_amount: s?.total_saved_amount || 0 }
            });
        }
        setLists(finalLists);
        setIsLoading(false);
    };

    // Re-fetch when refreshTrigger changes
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

    if (selectedList) {
        return (
            <div className="w-full animate-in slide-in-from-right-4 fade-in duration-300">
                <Button variant="ghost" onClick={handleBack} className="mb-4 text-slate-500 hover:text-slate-800 pl-0 h-auto gap-1 text-base"><span className="text-lg">←</span> Back to Lists</Button>
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
                        <div className="flex justify-between items-start mb-3"><div className={`p-2 rounded-xl ${listType === 'wishlist' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{listType === 'wishlist' ? <Target className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}</div>{list.is_private && <Lock className="w-4 h-4 text-slate-300" />}</div>
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

    // --- NEW STATE FOR REFRESHING ---
    const [refreshKey, setRefreshKey] = useState(0);

    const [hideBalances, setHideBalances] = useState(false);

    const currencySymbol = getCurrencySymbol(household.currency || 'NGN');

    useEffect(() => {
        const savedPrivacy = localStorage.getItem("listner_privacy_mode");
        if (savedPrivacy === "true") setHideBalances(true);

        async function fetchData() {
            const { count: members } = await supabase.from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', household.id);
            if (members !== null) setMemberCount(members);
        }
        fetchData();

        if (!user.user_metadata?.onboarding_complete) {
            setShowOnboarding(true);
        }
    }, [household.id, user]);

    const togglePrivacy = () => {
        const newVal = !hideBalances;
        setHideBalances(newVal);
        localStorage.setItem("listner_privacy_mode", String(newVal));
    }

    const getPageTitle = (tab: string) => { switch (tab) { case 'home': return 'Dashboard'; case 'wishlist': return 'Wishlists'; case 'shopping': return 'Shopping Lists'; case 'finance': return 'Finance'; case 'settings': return 'Settings'; default: return 'Dashboard'; } }
    const getGreeting = () => { const hour = new Date().getHours(); if (hour < 12) return "Good morning"; if (hour < 18) return "Good afternoon"; return "Good evening"; }

    const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
    const greeting = `${getGreeting()}, ${formattedName}`;

    // Trigger a refresh
    const handleGlobalRefresh = () => {
        setRefreshKey(prev => prev + 1);
    }

    const handleOnboardingComplete = () => {
        // Fix: Mark tutorial as seen so it doesn't pop up right after onboarding
        localStorage.setItem(`tutorial_seen_${user.id}`, "true");
        setShowOnboarding(false);
        // Safe window reload to refresh data
        if (typeof window !== "undefined") {
            window.location.reload();
        }
    }

    return (
        <SidebarLayout user={user} household={household} memberCount={memberCount} activeTab={activeTab} setActiveTab={setActiveTab}>
            <div className="w-full pb-24 relative">

                {/* --- UPDATED HEADER LAYOUT --- */}
                <div className="hidden md:flex flex-row items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-500 tracking-tight">{getPageTitle(activeTab)}</h1>
                        {activeTab === 'home' && <p className="text-sm text-slate-400 font-medium mt-0.5">{greeting}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell userId={user.id} onNavigate={(tab) => setActiveTab(tab)} />
                        <Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-slate-400 hover:bg-slate-100 rounded-full">
                            {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </Button>
                        {memberCount < 2 && (
                            <Button onClick={() => setIsSyncOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold px-4 h-10 gap-2">
                                <UserPlus className="w-4 h-4" /> Invite
                            </Button>
                        )}
                    </div>
                </div>

                <div className="md:hidden mb-6 space-y-3">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{getPageTitle(activeTab)}</h1>
                        {memberCount < 2 && (
                            <Button onClick={() => setIsSyncOpen(true)} className="bg-violet-600 text-white rounded-full text-xs h-8 px-3 font-bold">
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite
                            </Button>
                        )}
                    </div>

                    <div className="flex justify-between items-end">
                        <p className="text-sm text-slate-500 font-medium pb-1">{greeting}</p>
                        <div className="flex items-center gap-1">
                            <NotificationBell userId={user.id} onNavigate={(tab) => setActiveTab(tab)} />
                            {(activeTab === 'home' || activeTab === 'finance') && (
                                <Button variant="outline" size="icon" onClick={togglePrivacy} className="h-9 w-9 rounded-full border-slate-200 text-slate-400">
                                    {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                    <TabsContent value="home" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        <HomeOverview user={user} household={household} currencySymbol={currencySymbol} hideBalances={hideBalances} />
                    </TabsContent>

                    <TabsContent value="wishlist" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        <ListManager user={user} household={household} listType="wishlist" onListSelected={setIsListDetailActive} currencySymbol={currencySymbol} refreshTrigger={refreshKey} />
                    </TabsContent>

                    <TabsContent value="shopping" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        <ListManager user={user} household={household} listType="shopping" onListSelected={setIsListDetailActive} currencySymbol={currencySymbol} refreshTrigger={refreshKey} />
                    </TabsContent>

                    <TabsContent value="finance" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        <Finance user={user} household={household} currencySymbol={currencySymbol} hideBalances={hideBalances} />
                    </TabsContent>

                    <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        <SettingsView user={user} household={household} />
                    </TabsContent>
                </Tabs>

                {!isListDetailActive && activeTab !== 'settings' && (
                    <PortalFAB onClick={() => setIsFabOpen(true)} className={`h-16 w-16 rounded-full shadow-2xl bg-lime-400 hover:bg-lime-500 text-slate-900 flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:rotate-90 duration-300`} icon={Plus} />
                )}

                {showOnboarding && <OnboardingWizard user={user} household={household} onComplete={handleOnboardingComplete} />}

                <ContextualCreateDialog isOpen={isFabOpen} onOpenChange={setIsFabOpen} context={activeTab} user={user} household={household} onSuccess={handleGlobalRefresh} currencySymbol={currencySymbol} />

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