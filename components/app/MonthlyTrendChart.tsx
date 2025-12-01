"use client"

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CardTitle } from "@/components/ui/card"

type ExpenseItem = { date: string; amount: number; };

const formatAxisValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toString();
};

export function MonthlyTrendChart({ rawData, currencySymbol }: { rawData: ExpenseItem[], currencySymbol: string }) {
    // Default filter is now 7D per request
    const [filter, setFilter] = useState<'7D' | '1M' | '3M' | '6M' | 'YTD' | 'ALL'>('7D');

    const chartData = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];

        const now = new Date();
        let startDate = new Date();
        let dateFormat: 'day' | 'month' = 'month';

        switch (filter) {
            case '7D':
                startDate.setDate(now.getDate() - 6);
                dateFormat = 'day';
                break;
            case '1M':
                startDate.setMonth(now.getMonth() - 1);
                dateFormat = 'day';
                break;
            case '3M':
                startDate.setMonth(now.getMonth() - 3);
                dateFormat = 'month';
                break;
            case '6M':
                startDate.setMonth(now.getMonth() - 6);
                dateFormat = 'month';
                break;
            case 'YTD':
                startDate = new Date(now.getFullYear(), 0, 1);
                dateFormat = 'month';
                break;
            case 'ALL':
                startDate = new Date(0);
                dateFormat = 'month';
                break;
        }

        let filtered = rawData.filter(e => new Date(e.date) >= startDate);

        // FALLBACK LOGIC REQUESTED: "if no data use this month and so on"
        // If 7D is empty, fallback to 1M view (but don't change filter state, just show data)
        if (filtered.length === 0 && filter === '7D') {
            const fallbackStartDate = new Date();
            fallbackStartDate.setMonth(now.getMonth() - 1); // Fallback to 1M
            filtered = rawData.filter(e => new Date(e.date) >= fallbackStartDate);
            // If still empty, it just shows empty chart
            if (filtered.length > 0) dateFormat = 'day';
        }

        const grouped = new Map<string, number>();

        if (dateFormat === 'day') {
            // Prefill days for 7D/1M to ensure smooth x-axis
            // Only do strict prefill for 7D to look nice
            if (filter === '7D' && filtered.length > 0) {
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + i);
                    const key = d.toLocaleDateString('en-US', { weekday: 'short' });
                    grouped.set(key, 0);
                }
            }

            filtered.forEach(e => {
                const d = new Date(e.date);
                const key = filter === '7D'
                    ? d.toLocaleDateString('en-US', { weekday: 'short' })
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                grouped.set(key, (grouped.get(key) || 0) + e.amount);
            });
        } else {
            filtered.forEach(e => {
                const d = new Date(e.date);
                const key = d.toLocaleDateString('en-US', { month: 'short' });
                grouped.set(key, (grouped.get(key) || 0) + e.amount);
            });
        }

        return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));

    }, [rawData, filter]);

    if (!rawData || rawData.length === 0) {
        return (
            <div className="flex flex-col w-full h-[250px]">
                <div className="flex justify-between items-center mb-4">
                    <CardTitle className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Spending Trend
                    </CardTitle>
                </div>
                <div className="flex items-center justify-center w-full h-full bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs">No trend data yet</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-3 py-2 bg-white/95 border border-slate-100 shadow-xl rounded-lg text-xs">
                    <p className="font-bold text-slate-700 mb-1">{label}</p>
                    <p className="text-emerald-600 font-mono font-bold text-sm">
                        {currencySymbol}{payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Spending Trend
                </CardTitle>
                <div className="flex gap-1">
                    {(['7D', '1M', '3M', '6M', 'YTD', 'ALL'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`
                                text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors
                                ${filter === key
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}
                            `}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            minTickGap={20}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatAxisValue}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#059669"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#chartGradient)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}