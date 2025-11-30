"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Household } from "@/lib/types"
import { ArrowRightLeft, ShoppingCart, PiggyBank, Loader2, Wallet, ArrowUp, ArrowDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { TooltipProvider } from "@/components/ui/tooltip"

import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { CategoryDonutChart } from "./CategoryDonutChart";

const CATEGORY_COLORS: { [key: string]: string } = {
    "Groceries": "#22c55e",
    "Rent/Mortgage": "#3b82f6",
    "Utilities": "#f97316",
    "Transport": "#6366f1",
    "Subscriptions": "#f43f5e",
    "Personal": "#a855f7",
    "Other": "#94a3b8"
};

// Helper: Get background color class for the Progress Bar Indicator
const getProgressIndicatorColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 70) return "bg-emerald-500";
    if (percent >= 30) return "bg-amber-500";
    return "bg-rose-500";
};

// Helper: Get text color class for the Percentage Text
const getProgressTextColor = (percent: number) => {
    if (percent >= 100) return "text-emerald-600";
    if (percent >= 70) return "text-emerald-600";
    if (percent >= 30) return "text-amber-600";
    return "text-rose-600";
};

export function HomeOverview({ user, household, currencySymbol, hideBalances, refreshTrigger }: { user: User, household: Household, currencySymbol: string, hideBalances?: boolean, refreshTrigger?: number }) {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        netBalance: 0, shoppingCount: 0, shoppingCost: 0, wishlistSaved: 0,
        wishlistTotal: 0, monthlySpend: 0, priorMonthlySpend: 0, unsettledCount: 0,
        chartData: { monthly: [] as any[], category: {} as any }
    })

    useEffect(() => {
        async function fetchGlobalStats() {
            try {
                // Only set loading true if it's the initial load to avoid flickering on soft refresh
                if (refreshTrigger === 0) setLoading(true)

                const { data: dashboardData, error } = await supabase.rpc('get_global_dashboard_data', {
                    target_household_id: household.id,
                    current_user_id: user.id
                });

                if (error) { console.error("RPC Error:", error.message); return; }

                const data = dashboardData as any;
                const monthlyTrendData = data.monthly_trend_data || [];
                const categoryBreakdown = data.category_breakdown || {};

                setStats({
                    netBalance: parseFloat(data.net_balance) || 0,
                    monthlySpend: parseFloat(data.monthly_spend) || 0,
                    priorMonthlySpend: parseFloat(data.prior_monthly_spend) || 0,
                    unsettledCount: data.unsettled_count || 0,
                    shoppingCount: data.shopping_count || 0,
                    shoppingCost: parseFloat(data.shopping_cost) || 0,
                    wishlistSaved: parseFloat(data.wishlist_saved) || 0,
                    wishlistTotal: parseFloat(data.wishlist_total) || 0,
                    chartData: { monthly: monthlyTrendData, category: categoryBreakdown }
                });

            } catch (error) { console.error("Error:", error) } finally { setLoading(false) }
        }
        fetchGlobalStats()
    }, [household.id, user.id, refreshTrigger])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>

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

    const monthlyChartData = stats.chartData.monthly;
    const finalCategoryData = Object.keys(stats.chartData.category).map(key => ({
        name: key, value: stats.chartData.category[key], color: CATEGORY_COLORS[key] || CATEGORY_COLORS["Other"]
    }));

    return (
        <TooltipProvider>
            <div className="space-y-4">
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
                                {isBalanced ? 'Settled' : (hideBalances ? '****' : (netPositive ? '+' : '-') + currencySymbol + Math.abs(stats.netBalance).toLocaleString())}
                            </div>
                            {!isBalanced && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                                    {netPositive ? "You are owed" : "You owe"}
                                </p>
                            )}
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

                    {/* CARD 4: GOALS - UPDATED COLOR LOGIC */}
                    <Card className="rounded-2xl shadow-sm border border-slate-100 group relative overflow-hidden hover:border-purple-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goals</CardTitle>
                            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                                <PiggyBank className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 relative z-10">
                            <div className="flex justify-between items-end mb-1.5">
                                {/* TEXT COLOR UPDATED */}
                                <div className={`text-2xl font-bold tracking-tight ${getProgressTextColor(wishlistProgress)}`}>
                                    {Math.round(wishlistProgress)}%
                                </div>
                                <span className="text-[10px] text-slate-400 mb-1 font-medium">{formatMoney(stats.wishlistSaved)}</span>
                            </div>
                            {/* BAR COLOR UPDATED - Track is neutral (bg-slate-100), Indicator is colored */}
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
                        <CardTitle className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Expense Breakdown
                        </CardTitle>
                        <div className="w-full">
                            <CategoryDonutChart data={finalCategoryData} currencySymbol={currencySymbol} />
                        </div>
                    </Card>

                    <Card className="lg:col-span-2 rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-all bg-white">
                        <CardTitle className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Spending Trend
                        </CardTitle>
                        <div className="w-full">
                            <MonthlyTrendChart data={monthlyChartData} currencySymbol={currencySymbol} />
                        </div>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    )
}