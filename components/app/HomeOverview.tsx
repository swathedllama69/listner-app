"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Household } from "@/lib/types"
import { ArrowRightLeft, ShoppingCart, PiggyBank, Loader2, Wallet, ArrowUp, ArrowDown, CloudOff } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { CategoryDonutChart } from "./CategoryDonutChart";
import { CACHE_KEYS, saveToCache, loadFromCache } from "@/lib/offline";

const CATEGORY_COLORS: { [key: string]: string } = {
    "Groceries": "#22c55e",
    "Rent/Mortgage": "#3b82f6",
    "Utilities": "#f97316",
    "Transport": "#6366f1",
    "Subscriptions": "#f43f5e",
    "Personal": "#a855f7",
    "Other": "#94a3b8"
};

const getProgressIndicatorColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 70) return "bg-emerald-500";
    if (percent >= 30) return "bg-amber-500";
    return "bg-rose-500";
};

const getProgressTextColor = (percent: number) => {
    if (percent >= 100) return "text-emerald-600";
    if (percent >= 70) return "text-emerald-600";
    if (percent >= 30) return "text-amber-600";
    return "text-rose-600";
};

export function HomeOverview({ user, household, currencySymbol, hideBalances, refreshTrigger, viewScope }: { user: User, household: Household, currencySymbol: string, hideBalances?: boolean, refreshTrigger?: number, viewScope: 'unified' | 'household' | 'solo' }) {
    const [loading, setLoading] = useState(true)
    const [usingCachedData, setUsingCachedData] = useState(false);
    const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);

    // FILTERS
    const [categoryFilter, setCategoryFilter] = useState<'this_month' | 'last_month' | 'all'>('this_month');

    // DATA STATES
    const [stats, setStats] = useState({
        netBalance: 0, shoppingCount: 0, shoppingCost: 0, wishlistSaved: 0,
        wishlistTotal: 0, monthlySpend: 0, priorMonthlySpend: 0, unsettledCount: 0
    })
    const [allExpenses, setAllExpenses] = useState<any[]>([]); // Raw expenses for flexible charting

    // Offline Indicator Delay
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (usingCachedData) {
            timeout = setTimeout(() => {
                setShowOfflineIndicator(true);
            }, 3000);
        } else {
            setShowOfflineIndicator(false);
        }
        return () => clearTimeout(timeout);
    }, [usingCachedData]);

    useEffect(() => {
        async function fetchData() {
            // CACHE: Append scope to key so we don't show "Unified" data when in "Solo" mode
            const baseKey = CACHE_KEYS.DASHBOARD_STATS(household.id);
            const cacheKey = `${baseKey}_${viewScope}`;

            // 1. Try Cache
            const cached = loadFromCache<any>(cacheKey);
            if (cached && refreshTrigger === 0) {
                setStats(cached.stats);
                setAllExpenses(cached.expenses || []);
                setUsingCachedData(true);
                setLoading(false);
            } else if (refreshTrigger === 0) {
                setLoading(true);
            }

            try {
                // 2. Fetch Dashboard Stats (RPC) with Scope Filter
                const { data: dashboardData, error: rpcError } = await supabase.rpc('get_global_dashboard_data', {
                    target_household_id: household.id,
                    current_user_id: user.id,
                    scope_filter: viewScope // PASS SCOPE
                });

                if (rpcError) throw rpcError;

                // 3. Fetch Recent Expenses (for flexible charts)
                let expenseQuery = supabase
                    .from('expenses')
                    .select('amount, category, expense_date')
                    .eq('household_id', household.id)
                    .order('expense_date', { ascending: false });

                // APPLY SCOPE FILTER TO EXPENSE LIST
                if (viewScope === 'household') {
                    expenseQuery = expenseQuery.eq('scope', 'household');
                } else if (viewScope === 'solo') {
                    expenseQuery = expenseQuery.eq('scope', 'personal');
                }

                const { data: expenseData, error: expError } = await expenseQuery;

                if (expError) throw expError;

                const finalStats = {
                    netBalance: parseFloat(dashboardData.net_balance) || 0,
                    monthlySpend: parseFloat(dashboardData.monthly_spend) || 0,
                    priorMonthlySpend: parseFloat(dashboardData.prior_monthly_spend) || 0,
                    unsettledCount: dashboardData.unsettled_count || 0,
                    shoppingCount: dashboardData.shopping_count || 0,
                    shoppingCost: parseFloat(dashboardData.shopping_cost) || 0,
                    wishlistSaved: parseFloat(dashboardData.wishlist_saved) || 0,
                    wishlistTotal: parseFloat(dashboardData.wishlist_total) || 0,
                };

                setStats(finalStats);
                setAllExpenses(expenseData || []);
                setUsingCachedData(false);

                // Save combined data to cache
                saveToCache(cacheKey, { stats: finalStats, expenses: expenseData });

            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [household.id, user.id, refreshTrigger, viewScope]); // Re-fetch when scope changes


    // --- PROCESSED CHART DATA ---

    // 1. Category Data (Donut)
    const categoryData = useMemo(() => {
        if (!allExpenses.length) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthIdx = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        let filtered = allExpenses;

        if (categoryFilter === 'this_month') {
            filtered = allExpenses.filter(e => {
                const d = new Date(e.expense_date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            if (filtered.length === 0) filtered = allExpenses; // Fallback
        } else if (categoryFilter === 'last_month') {
            filtered = allExpenses.filter(e => {
                const d = new Date(e.expense_date);
                return d.getMonth() === lastMonthIdx && d.getFullYear() === lastMonthYear;
            });
        }

        const grouped: { [key: string]: number } = {};
        filtered.forEach(e => {
            grouped[e.category] = (grouped[e.category] || 0) + e.amount;
        });

        return Object.keys(grouped).map(key => ({
            name: key,
            value: grouped[key],
            color: CATEGORY_COLORS[key] || CATEGORY_COLORS["Other"]
        }));
    }, [allExpenses, categoryFilter]);


    // 2. Trend Data (Area Chart)
    const dailyTrendData = useMemo(() => {
        return allExpenses.map(e => ({
            date: e.expense_date,
            amount: e.amount
        }));
    }, [allExpenses]);


    if (loading && !usingCachedData) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>

    const formatMoney = (amount: number) => {
        if (hideBalances) return `${currencySymbol}****`;
        return `${currencySymbol}${amount.toLocaleString()}`;
    }

    const netPositive = stats.netBalance >= 0
    const isBalanced = stats.netBalance === 0;
    const wishlistProgress = stats.wishlistTotal > 0 ? (stats.wishlistSaved / stats.wishlistTotal) * 100 : 0
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' })

    const trendDiff = stats.monthlySpend - stats.priorMonthlySpend;
    const trendPercentage = stats.priorMonthlySpend === 0 ? (stats.monthlySpend > 0 ? 100 : 0) : (trendDiff / stats.priorMonthlySpend) * 100;
    const isSpendingUp = trendDiff > 0;
    const TrendIcon = isSpendingUp ? ArrowUp : ArrowDown;

    return (
        <TooltipProvider>
            <div className={`space-y-4 transition-opacity duration-500 ${usingCachedData ? 'opacity-90' : 'opacity-100'}`}>

                {showOfflineIndicator && (
                    <div className="flex justify-end px-1 animate-in fade-in slide-in-from-top-2 duration-500">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1 border border-amber-100">
                            <CloudOff className="w-3 h-3" /> Offline Mode
                        </span>
                    </div>
                )}

                {/* STATS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* CARD 1: BALANCE */}
                    <Card className={`rounded-2xl shadow-sm border border-slate-100 group relative overflow-hidden ${isBalanced ? '' : (netPositive ? 'hover:border-emerald-200' : 'hover:border-rose-200')}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Balance</CardTitle>
                            <div className={`p-1.5 rounded-lg ${isBalanced ? 'bg-slate-50 text-slate-400' : (netPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}`}>
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 relative z-10">
                            <div className={`text-2xl font-bold tracking-tight ${isBalanced ? 'text-emerald-600' : (netPositive ? 'text-emerald-700' : 'text-rose-700')}`}>
                                {/* FIX: Show 0 instead of Settled text, handle hidden balances */}
                                {hideBalances ? '****' : (isBalanced ? `${currencySymbol}0` : (netPositive ? '+' : '-') + currencySymbol + Math.abs(stats.netBalance).toLocaleString())}
                            </div>
                            {!isBalanced && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                                    {netPositive ? "You are owed" : "You owe"}
                                </p>
                            )}
                            {isBalanced && <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">All settled up</p>}
                        </CardContent>
                    </Card>

                    {/* CARD 2: SPENDING */}
                    <Card className="rounded-2xl shadow-sm border border-slate-100 group relative overflow-hidden hover:border-indigo-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentMonthName}</CardTitle>
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                <Wallet className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 relative z-10">
                            <div className="text-2xl font-bold text-slate-800 tracking-tight">{formatMoney(stats.monthlySpend)}</div>
                            {stats.priorMonthlySpend > 0 ? (
                                <div className={`text-[10px] mt-1 flex items-center gap-1 font-medium ${isSpendingUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    <TrendIcon className="w-2.5 h-2.5" /> {Math.abs(Math.round(trendPercentage))}%
                                </div>
                            ) : <p className="text-[10px] text-slate-400 mt-0.5">No prior data</p>}
                        </CardContent>
                    </Card>

                    {/* CARD 3: SHOPPING */}
                    <Card className="rounded-2xl shadow-sm border border-slate-100 group relative overflow-hidden hover:border-sky-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shopping</CardTitle>
                            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                                <ShoppingCart className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 relative z-10">
                            <div className="text-2xl font-bold text-slate-800 tracking-tight">{formatMoney(stats.shoppingCost)}</div>
                            <p className="text-[10px] text-slate-400 mt-0.5"><span className="font-bold text-sky-600">{stats.shoppingCount}</span> items pending</p>
                        </CardContent>
                    </Card>

                    {/* CARD 4: GOALS */}
                    <Card className="rounded-2xl shadow-sm border border-slate-100 group relative overflow-hidden hover:border-purple-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goals</CardTitle>
                            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                                <PiggyBank className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 relative z-10">
                            <div className="flex justify-between items-end mb-1.5">
                                <div className={`text-2xl font-bold tracking-tight ${getProgressTextColor(wishlistProgress)}`}>
                                    {Math.round(wishlistProgress)}%
                                </div>
                                <span className="text-[10px] text-slate-400 mb-1 font-medium">{formatMoney(stats.wishlistSaved)}</span>
                            </div>
                            <Progress
                                value={wishlistProgress}
                                className="h-1.5 bg-slate-100"
                                indicatorClassName={getProgressIndicatorColor(wishlistProgress)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <Card className="rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-all bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Expense Breakdown
                            </CardTitle>

                            {/* CATEGORY FILTER UI */}
                            <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
                                <SelectTrigger className="h-7 text-[10px] w-[100px] bg-slate-50 border-slate-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="this_month">This Month</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full">
                            <CategoryDonutChart data={categoryData} currencySymbol={currencySymbol} />
                        </div>
                    </Card>

                    <Card className="lg:col-span-2 rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-all bg-white">
                        {/* Note: MonthlyTrendChart handles its own internal filtering state */}
                        <MonthlyTrendChart rawData={dailyTrendData} currencySymbol={currencySymbol} />
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    )
}