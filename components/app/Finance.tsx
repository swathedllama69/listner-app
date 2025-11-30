"use client"

import { useState, useEffect, FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Household } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DollarSign, Wallet, History, HandCoins, Pencil, Trash2,
    ChevronDown, ChevronLeft, ChevronRight, Download,
    Info, Lightbulb, FileSpreadsheet, ArrowRightLeft
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EXPENSE_CATEGORIES } from "@/lib/constants"

type HouseholdMember = { user_id: string; email: string }
type Expense = { id: number; name: string; amount: number; category: string; user_id: string; notes: string | null; expense_date: string }
type Credit = { id: number; amount: number; notes: string | null; is_settled: boolean; lender_user_id: string | null; lender_name: string; borrower_user_id: string | null; borrower_name: string; created_at: string }

function ConfirmDialog({ isOpen, onOpenChange, title, description, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, description: string, onConfirm: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter className="flex gap-2 sm:justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Confirm</Button></DialogFooter></DialogContent>
        </Dialog>
    )
}

export function Finance({ user, household, currencySymbol, hideBalances, refreshTrigger }: { user: User, household: Household, currencySymbol: string, hideBalances?: boolean, refreshTrigger?: number }) {
    const [members, setMembers] = useState<HouseholdMember[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [credits, setCredits] = useState<Credit[]>([])

    useEffect(() => {
        async function fetchFinanceData() {
            const { data: memberData } = await supabase.from('household_members').select('user_id, profiles(email)').eq('household_id', household.id);
            if (memberData) {
                const mappedMembers = memberData.map((m: any) => ({
                    user_id: m.user_id,
                    email: m.profiles?.email || 'Partner'
                }));
                setMembers(mappedMembers);
            }

            const { data: expenseData } = await supabase.from('expenses').select('*').eq('household_id', household.id).order('expense_date', { ascending: false });
            if (expenseData) setExpenses(expenseData as Expense[]);

            const { data: creditData } = await supabase.from('credits').select('*').eq('household_id', household.id).order('is_settled', { ascending: true }).order('created_at', { ascending: false });
            if (creditData) setCredits(creditData as Credit[]);
        }
        fetchFinanceData();

        const expenseChannel = supabase.channel('expenses_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${household.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') setExpenses((prev) => [payload.new as Expense, ...prev]);
                if (payload.eventType === 'UPDATE') setExpenses((prev) => prev.map(e => e.id === payload.new.id ? payload.new as Expense : e));
                if (payload.eventType === 'DELETE') setExpenses((prev) => prev.filter(e => e.id !== payload.old.id));
            }).subscribe()

        const creditChannel = supabase.channel('credits_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'credits', filter: `household_id=eq.${household.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') setCredits((prev) => [payload.new as Credit, ...prev]);
                if (payload.eventType === 'UPDATE') setCredits((prev) => prev.map(c => c.id === payload.new.id ? payload.new as Credit : c));
                if (payload.eventType === 'DELETE') setCredits((prev) => prev.filter(c => c.id !== payload.old.id));
            }).subscribe()

        return () => { supabase.removeChannel(expenseChannel); supabase.removeChannel(creditChannel) }
    }, [household.id, user, refreshTrigger]);

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    const handleExportExpenses = () => {
        const headers = ["Date", "Item", "Category", "Amount", "Notes", "User"];
        const rows = expenses.map(e => [new Date(e.expense_date).toLocaleDateString(), `"${e.name.replace(/"/g, '""')}"`, e.category, e.amount, `"${(e.notes || '').replace(/"/g, '""')}"`, e.user_id === user.id ? "Me" : "Partner"]);
        downloadCSV([headers.join(","), ...rows.map(r => r.join(","))].join("\n"), `Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    }

    const handleExportDebts = () => {
        const headers = ["Date", "Status", "Amount", "Lender", "Borrower", "Note"];
        const rows = credits.map(c => [new Date(c.created_at).toLocaleDateString(), c.is_settled ? "Settled" : "Active", c.amount, c.lender_name, c.borrower_name, `"${(c.notes || '').replace(/"/g, '""')}"`]);
        downloadCSV([headers.join(","), ...rows.map(r => r.join(","))].join("\n"), `Debts_${new Date().toISOString().split('T')[0]}.csv`);
    }

    // Net Balance
    const activeCredits = credits.filter(c => !c.is_settled);
    let iAmOwed = 0; let iOwe = 0;
    activeCredits.forEach(c => { if (c.lender_user_id === user.id) iAmOwed += c.amount; else if (c.borrower_user_id === user.id) iOwe += c.amount; });
    const netBalance = iAmOwed - iOwe;
    const isPositive = netBalance >= 0;
    const isBalanced = netBalance === 0;
    const displayBalance = hideBalances ? '****' : Math.abs(netBalance).toLocaleString();

    return (
        <TooltipProvider>
            <div className="w-full relative min-h-[80vh] flex flex-col bg-slate-50/50">
                {/* THEME UPDATED HEADER: Teal/Emerald Gradient */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between shadow-md mb-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-teal-100 uppercase tracking-widest">Net Position</span>
                        {!isBalanced && <span className="text-[10px] font-medium text-white/90">{isPositive ? "You are owed" : "You owe"}</span>}
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                        {isBalanced ? 'Settled' : (isPositive ? '+' : '-')}{currencySymbol}{displayBalance}
                    </div>
                </div>

                <Tabs defaultValue="summary" className="w-full">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <TabsList className="flex w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
                            {[{ id: "summary", label: "Summary", icon: DollarSign }, { id: "expenses", label: "Expenses", icon: History }, { id: "credit", label: "Debts", icon: HandCoins }].map(tab => (
                                <TabsTrigger key={tab.id} value={tab.id} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold text-slate-500 data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="hidden sm:flex gap-2 ml-2 border-slate-200 text-slate-600 bg-white">
                                    <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleExportExpenses}><FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Expenses (CSV)</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportDebts}><FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> Debts/IOUs (CSV)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <TabsContent value="summary" className="animate-in fade-in"><FinanceSummary expenses={expenses} credits={credits} user={user} currencySymbol={currencySymbol} hideBalances={hideBalances} /></TabsContent>
                    <TabsContent value="expenses" className="animate-in fade-in"><ExpensesList user={user} household={household} members={members} expenses={expenses} setExpenses={setExpenses} currencySymbol={currencySymbol} hideBalances={hideBalances} /></TabsContent>
                    <TabsContent value="credit" className="animate-in fade-in"><CreditsList user={user} household={household} members={members} credits={credits} setCredits={setCredits} currencySymbol={currencySymbol} hideBalances={hideBalances} /></TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    )
}

function FinanceSummary({ expenses, credits, user, currencySymbol, hideBalances }: { expenses: Expense[], credits: Credit[], user: User, currencySymbol: string, hideBalances?: boolean }) {
    const activeCredits = credits.filter(c => !c.is_settled);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const now = new Date();
    const monthExpenses = expenses.filter(e => { const d = new Date(e.expense_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, e) => sum + e.amount, 0);
    const recentExpenses = expenses.slice(0, 5);
    const format = (val: number) => hideBalances ? '****' : val.toLocaleString();

    return (
        <div className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-slate-500 to-slate-700 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Lifetime Spend</CardTitle><History className="w-4 h-4 text-slate-300" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{currencySymbol}{format(totalExpenses)}</div></CardContent>
                </Card>
                <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">{now.toLocaleString('default', { month: 'long' })} Spend</CardTitle><Wallet className="w-4 h-4 text-indigo-200" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{currencySymbol}{format(monthExpenses)}</div></CardContent>
                </Card>
                <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-[10px] font-bold text-amber-100 uppercase tracking-wider">Unsettled Items</CardTitle><HandCoins className="w-4 h-4 text-amber-100" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{activeCredits.length}</div></CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm bg-white/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Activity</CardTitle></CardHeader>
                <CardContent>
                    {recentExpenses.length === 0 ? <p className="text-slate-400 text-sm italic">No recent activity.</p> : (
                        <ul className="space-y-2">
                            {recentExpenses.map(e => (
                                <li key={e.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 uppercase border border-indigo-100">{e.category.substring(0, 2)}</div>
                                        <div><p className="text-sm font-medium text-slate-700">{e.name}</p><p className="text-[10px] text-slate-400">{new Date(e.expense_date).toLocaleDateString()}</p></div>
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm">{currencySymbol}{format(e.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function ExpensesList({ user, household, members, expenses, setExpenses, currencySymbol, hideBalances }: { user: User, household: Household, members: HouseholdMember[], expenses: Expense[], setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>, currencySymbol: string, hideBalances?: boolean }) {
    const [form, setForm] = useState({ name: '', price: '', quantity: '1', amount: '', category: EXPENSE_CATEGORIES[0], isReimbursable: false, reimburseAmount: '', notes: '', borrowerId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: number } | null>(null);
    const [filter, setFilter] = useState<'All' | 'Month' | 'Prev'>('Month');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const partners = members.filter(m => m.user_id !== user?.id);
    const hasPartners = partners.length > 0;

    const formPrice = parseFloat(form.price) || 0;
    const formQty = parseInt(form.quantity) || 1;
    const formTotal = formPrice * formQty;

    const handleExpenseSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const amountToLog = formTotal > 0 ? formTotal : parseFloat(form.amount);

        if (!form.name || amountToLog <= 0) return alert('Invalid details');
        setIsSubmitting(true);
        try {
            const { data: expense, error: expenseError } = await supabase.from('expenses').insert({
                user_id: user.id, household_id: household.id, name: form.name, amount: amountToLog, category: form.category, notes: form.notes || null, expense_date: new Date().toISOString()
            }).select().single();

            if (expenseError) throw expenseError;

            setExpenses(prev => [expense as Expense, ...prev]);

            if (form.isReimbursable && hasPartners) {
                const reimburseVal = parseFloat(form.reimburseAmount);
                if (reimburseVal > 0) {
                    let targetBorrowerId = partners[0].user_id;
                    if (partners.length > 1 && form.borrowerId) targetBorrowerId = form.borrowerId;
                    const targetBorrowerName = members.find(m => m.user_id === targetBorrowerId)?.email.split('@')[0] || 'Partner';
                    await supabase.from('credits').insert({
                        household_id: household.id, amount: reimburseVal, notes: `Reimbursement: ${form.name}`, lender_user_id: user.id, lender_name: 'Me', borrower_user_id: targetBorrowerId, borrower_name: targetBorrowerName
                    });
                }
            }
            setForm({ name: '', price: '', quantity: '1', amount: '', category: EXPENSE_CATEGORIES[0], isReimbursable: false, reimburseAmount: '', notes: '', borrowerId: '' });
            alert('Expense logged!');
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    };

    const handleDeleteExpense = async () => {
        if (!deleteConfirm) return;
        const { error } = await supabase.from('expenses').delete().eq('id', deleteConfirm.id);
        if (error) alert(error.message);
        else setExpenses(prev => prev.filter(e => e.id !== deleteConfirm.id));
        setDeleteConfirm(null);
    }
    const handleExpenseUpdated = async (updatedForm: any) => {
        if (!editingExpense) return;
        const { error } = await supabase.from('expenses').update({ name: updatedForm.name, amount: parseFloat(updatedForm.amount), category: updatedForm.category, notes: updatedForm.notes }).eq('id', editingExpense.id);
        if (error) alert(error.message);
        else {
            setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...updatedForm, amount: parseFloat(updatedForm.amount) } : e));
            setEditingExpense(null);
        }
    }
    const filteredExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        const now = new Date();
        if (filter === 'Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (filter === 'Prev') { const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear(); }
        return true;
    }).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
    const paginatedExpenses = filteredExpenses.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white p-5 rounded-2xl">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Add Expense</CardTitle>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-1"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="bg-slate-50 h-10 text-center" /></div>
                        <div className="col-span-3"><Label>Unit Price ({currencySymbol})</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="bg-slate-50 h-10" /></div>
                    </div>
                    {formTotal > 0 && <div className="flex justify-between items-center bg-teal-50 px-3 py-2 rounded-lg border border-teal-100"><span className="text-xs text-teal-600 font-bold uppercase">Total Cost</span><span className="text-lg font-bold text-teal-700">{currencySymbol}{formTotal.toLocaleString()}</span></div>}
                    <div className="grid grid-cols-1 gap-4"><div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger className="bg-slate-50 h-10 text-sm"><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div>
                    <div className="space-y-2"><Label>Description</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-slate-50 h-10 text-sm" /></div>
                    <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-slate-50 h-10 text-sm" /></div>
                    {formTotal === 0 && <div className="space-y-2"><Label>Total Amount ({currencySymbol})*</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-slate-50 h-10 text-sm" /></div>}
                    {hasPartners && <div className="space-y-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50"><div className="flex items-center space-x-2 mb-2"><Checkbox id="reimburse" checked={form.isReimbursable} onCheckedChange={(c) => setForm(f => ({ ...f, isReimbursable: c as boolean }))} /><Label htmlFor="reimburse" className="text-xs font-bold text-slate-600 cursor-pointer">Split Cost?</Label></div>{form.isReimbursable && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 pt-2"><div className="space-y-1.5"><Label className="text-[10px] text-slate-500 uppercase font-bold">Partner Owes ({currencySymbol})</Label><Input type="number" value={form.reimburseAmount} onChange={e => setForm({ ...form, reimburseAmount: e.target.value })} className="h-9 bg-white text-sm" placeholder="0.00" /></div>{partners.length > 1 && <div className="space-y-1.5"><Label className="text-[10px] text-slate-500 uppercase font-bold">Who?</Label><Select value={form.borrowerId} onValueChange={v => setForm({ ...form, borrowerId: v })}><SelectTrigger className="h-9 bg-white text-sm"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.email.split('@')[0]}</SelectItem>)}</SelectContent></Select></div>}</div>}</div>}
                    <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white h-10 text-sm font-bold" disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Expense'}</Button>
                </form>
            </Card>
            <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">History</h3><div className="flex gap-1">{['Month', 'Prev', 'All'].map((f: any) => (<button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 bg-slate-50'}`}>{f === 'Month' ? 'This Month' : f === 'Prev' ? 'Last Month' : 'All Time'}</button>))}</div></div>
                {paginatedExpenses.length === 0 ? <div className="text-center py-8 text-slate-400 text-xs">No expenses found.</div> :
                    paginatedExpenses.map((expense) => (
                        <div key={expense.id} className={`bg-white border rounded-xl shadow-sm transition-all cursor-pointer hover:border-indigo-200 group relative`} onClick={() => setEditingExpense(expense)}>
                            <div className="flex justify-between items-center p-3">
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-500`}>{expense.category.substring(0, 2).toUpperCase()}</div>
                                    <div><p className="font-semibold text-slate-800 text-sm">{expense.name}</p><p className="text-[10px] text-slate-500">{new Date(expense.expense_date).toLocaleDateString()}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 text-sm">{currencySymbol}{hideBalances ? '****' : expense.amount.toLocaleString()}</span>
                                    {/* EDIT ICON */}
                                    <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-2"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4 text-slate-500" /></Button><span className="text-xs font-medium text-slate-500">Page {page} of {totalPages}</span><Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4 text-slate-500" /></Button></div>
                )}
            </div>
            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Delete Expense?" description="Undo not available." onConfirm={handleDeleteExpense} />
            <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
                {editingExpense && <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Expense</DialogTitle><DialogDescription>Update transaction details.</DialogDescription></DialogHeader>
                    <div className="flex justify-end mb-2"><Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50" onClick={() => { setDeleteConfirm({ isOpen: true, id: editingExpense.id }); setEditingExpense(null); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button></div>
                    <EditExpenseForm expense={editingExpense} onExpenseUpdated={handleExpenseUpdated} categories={EXPENSE_CATEGORIES} currencySymbol={currencySymbol} />
                </DialogContent>}
            </Dialog>
        </div>
    );
}

function EditExpenseForm({ expense, onExpenseUpdated, categories, currencySymbol }: { expense: Expense; onExpenseUpdated: any; categories: string[]; currencySymbol: string; }) {
    const [form, setForm] = useState({ name: expense.name, amount: expense.amount.toString(), category: expense.category, notes: expense.notes || '' });
    const handleSubmit = (e: FormEvent) => { e.preventDefault(); onExpenseUpdated(form); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Amount ({currencySymbol})</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div><div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /><DialogFooter><Button type="submit" className='bg-teal-600'>Save Changes</Button></DialogFooter></form>
    );
}

function CreditsList({ user, household, members, credits, setCredits, currencySymbol, hideBalances }: { user: User, household: Household, members: HouseholdMember[], credits: Credit[], setCredits: React.Dispatch<React.SetStateAction<Credit[]>>, currencySymbol: string, hideBalances?: boolean }) {
    const [form, setForm] = useState({ amount: '', notes: '', direction: 'owe_me', personName: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: number, action: 'delete' | 'settle' } | null>(null);
    const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
    const partner = members.find(m => m.user_id !== user?.id);
    const partnerId = partner?.user_id;
    const isSingleUser = members.length <= 1;

    const handleAction = async () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.action === 'delete') await supabase.from('credits').delete().eq('id', deleteConfirm.id);
        else await supabase.from('credits').update({ is_settled: true }).eq('id', deleteConfirm.id);
        setDeleteConfirm(null);
    }
    const handleAddCredit = async (e: FormEvent) => {
        e.preventDefault(); const amount = parseFloat(form.amount);
        if (amount <= 0) return alert("Enter valid amount");
        const isOweMe = form.direction === 'owe_me';
        let lenderId = isOweMe ? user.id : null; let borrowerId = !isOweMe ? user.id : null;
        let lenderName = isOweMe ? 'Me' : form.personName; let borrowerName = !isOweMe ? 'Me' : form.personName;
        if (partnerId && !form.personName) { if (isOweMe) { borrowerId = partnerId; borrowerName = 'Partner'; } else { lenderId = partnerId; lenderName = 'Partner'; } }

        const { data, error } = await supabase.from('credits').insert({ household_id: household.id, amount, notes: form.notes || 'Manual', lender_user_id: lenderId, lender_name: lenderName, borrower_user_id: borrowerId, borrower_name: borrowerName }).select().single();
        if (error) { alert(error.message); } else { setCredits([data as Credit, ...credits]); setForm({ amount: '', notes: '', direction: 'owe_me', personName: '' }); }
    }

    // ⚡ NEW: Function to handle updates from the Edit Dialog
    const handleUpdateCredit = async (updated: { amount: number, notes: string, direction: string, personName: string }) => {
        if (!editingCredit) return;

        const isOweMe = updated.direction === 'owe_me';
        let lenderId = isOweMe ? user.id : null; let borrowerId = !isOweMe ? user.id : null;
        let lenderName = isOweMe ? 'Me' : updated.personName; let borrowerName = !isOweMe ? 'Me' : updated.personName;

        // If household has a partner and no specific name provided, default to partner
        if (partnerId && !updated.personName && !isSingleUser) {
            if (isOweMe) { borrowerId = partnerId; borrowerName = 'Partner'; }
            else { lenderId = partnerId; lenderName = 'Partner'; }
        }

        const { error, data } = await supabase.from('credits').update({
            amount: updated.amount,
            notes: updated.notes,
            lender_user_id: lenderId,
            lender_name: lenderName,
            borrower_user_id: borrowerId,
            borrower_name: borrowerName
        }).eq('id', editingCredit.id).select().single();

        if (error) alert(error.message);
        else {
            setCredits(prev => prev.map(c => c.id === editingCredit.id ? data as Credit : c));
            setEditingCredit(null);
        }
    }

    const activeCredits = credits.filter(c => !c.is_settled);
    const settledCredits = credits.filter(c => c.is_settled);

    return (
        <div className="space-y-6">
            <Card className="rounded-xl shadow-sm bg-white p-4 border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-4 border-b pb-2">Active Debts</h3>
                {activeCredits.length === 0 ? <p className="text-slate-400 text-center py-4 text-sm">All settled up!</p> : activeCredits.map(c => {
                    const isOwedToMe = c.lender_user_id === user.id;
                    return (
                        <div key={c.id} onClick={() => setEditingCredit(c)} className={`group flex justify-between items-center p-3 mb-2 rounded-lg border cursor-pointer hover:shadow-md transition-all ${isOwedToMe ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${isOwedToMe ? 'text-emerald-700' : 'text-rose-700'}`}>{currencySymbol}{hideBalances ? '****' : c.amount.toLocaleString()}</span>
                                    <Badge variant="outline" className="bg-white text-xs font-normal">{isOwedToMe ? "Owed to You" : "You Owe"}</Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 font-medium">{c.notes} <span className="opacity-50">• {isOwedToMe ? c.borrower_name : c.lender_name}</span></p>
                            </div>
                            <Pencil className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        </div>
                    )
                })}
            </Card>
            <Card className="p-5 bg-slate-50 border-slate-200">
                <div className="bg-white border border-slate-200 p-2 mb-4 rounded-lg text-xs text-slate-500 flex gap-2 items-start"><Info className="w-4 h-4 shrink-0 mt-0.5" /><div>Track IOU's here.</div></div>
                <form onSubmit={handleAddCredit} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Button type="button" variant={form.direction === 'owe_me' ? 'default' : 'outline'} className={form.direction === 'owe_me' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white'} onClick={() => setForm({ ...form, direction: 'owe_me' })}>I am Owed</Button><Button type="button" variant={form.direction === 'i_owe' ? 'default' : 'outline'} className={form.direction === 'i_owe' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-white'} onClick={() => setForm({ ...form, direction: 'i_owe' })}>I Owe</Button></div><div className="grid grid-cols-2 gap-3"><Input type="number" placeholder={`Amount (${currencySymbol})`} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required className="bg-white h-10" /><Input placeholder={partnerId && !isSingleUser ? "Partner (Default)" : "Name (e.g. Bank)"} value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })} disabled={!!(partnerId && !isSingleUser)} className="bg-white h-10" /></div><Input placeholder="What for? (e.g. Dinner)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-white h-10" /><Button type="submit" className="w-full bg-slate-900 text-white h-11 font-bold">Log Debt</Button></form></Card>
            {settledCredits.length > 0 && (<Accordion type="single" collapsible className="bg-white rounded-xl border border-slate-100 px-4"><AccordionItem value="settled" className="border-none"><AccordionTrigger className="text-slate-500 hover:no-underline text-sm">Settled History</AccordionTrigger><AccordionContent>{settledCredits.map(c => (<div key={c.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-xs text-slate-400"><span>{c.lender_user_id === user.id ? "Was Owed" : "Did Owe"} {currencySymbol}{hideBalances ? '****' : c.amount.toLocaleString()} - {c.notes}</span><Trash2 className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setDeleteConfirm({ isOpen: true, id: c.id, action: 'delete' })} /></div>))}</AccordionContent></AccordionItem></Accordion>)}
            <ConfirmDialog isOpen={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title={deleteConfirm?.action === 'settle' ? "Settle Debt?" : "Delete Entry?"} description="Confirm action." onConfirm={handleAction} />

            {/* ⚡ FIX: Improved Edit Credit Dialog */}
            <Dialog open={!!editingCredit} onOpenChange={() => setEditingCredit(null)}>
                {editingCredit && (
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader><DialogTitle>Manage Debt</DialogTitle><DialogDescription>Edit or Settle this debt.</DialogDescription></DialogHeader>

                        <EditCreditForm credit={editingCredit} userId={user.id} onUpdate={handleUpdateCredit} partnerId={partnerId} isSingleUser={isSingleUser} currencySymbol={currencySymbol} />

                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setDeleteConfirm({ isOpen: true, id: editingCredit.id, action: 'settle' }); setEditingCredit(null); }}>Mark Settled</Button>
                            <Button variant="ghost" className="flex-none text-rose-500 hover:bg-rose-50" onClick={() => { setDeleteConfirm({ isOpen: true, id: editingCredit.id, action: 'delete' }); setEditingCredit(null); }}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    )
}

// ⚡ NEW: Dedicated Edit Form for Credits to handle "Who Owes Who" logic
function EditCreditForm({ credit, userId, onUpdate, partnerId, isSingleUser, currencySymbol }: any) {
    const isOriginallyOwedToMe = credit.lender_user_id === userId;
    const [form, setForm] = useState({
        amount: credit.amount,
        notes: credit.notes || '',
        direction: isOriginallyOwedToMe ? 'owe_me' : 'i_owe',
        personName: isOriginallyOwedToMe ? credit.borrower_name : credit.lender_name
    });

    // If it's a partner debt, we hide the name field usually, unless user wants to manually override
    const isSystemUser = (isOriginallyOwedToMe && credit.borrower_user_id) || (!isOriginallyOwedToMe && credit.lender_user_id);

    return (
        <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
                <Button variant={form.direction === 'owe_me' ? 'default' : 'outline'} className={form.direction === 'owe_me' ? 'bg-emerald-600 text-white' : ''} onClick={() => setForm({ ...form, direction: 'owe_me' })}>I am Owed</Button>
                <Button variant={form.direction === 'i_owe' ? 'default' : 'outline'} className={form.direction === 'i_owe' ? 'bg-rose-600 text-white' : ''} onClick={() => setForm({ ...form, direction: 'i_owe' })}>I Owe</Button>
            </div>
            <div>
                <Label>Amount ({currencySymbol})</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })} />
            </div>
            <div>
                <Label>Person / Entity</Label>
                <Input
                    value={form.personName}
                    onChange={e => setForm({ ...form, personName: e.target.value })}
                    // Disable edit if it's linked to a real partner user to prevent desync, unless user wants to switch to manual? 
                    // User asked to "customize or change the name". So we enable it but hint it might disconnect user link.
                    placeholder="Name"
                />
                {isSystemUser && <p className="text-[10px] text-slate-400 mt-1">Currently linked to Partner.</p>}
            </div>
            <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={() => onUpdate(form)} className="w-full bg-slate-900">Save Changes</Button>
        </div>
    )
}