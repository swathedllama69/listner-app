"use client"

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type MonthlyData = { month: string; month_start: string; total: number; };

export function MonthlyTrendChart({ data, currencySymbol }: { data: MonthlyData[], currencySymbol: string }) {
    const [filter, setFilter] = useState<'3M' | '6M' | 'YTD' | 'ALL'>('6M');

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Sort data chronologically to ensure slicing works correctly
        const sortedData = [...data].sort((a, b) => new Date(a.month_start).getTime() - new Date(b.month_start).getTime());

        switch (filter) {
            case '3M':
                return sortedData.slice(-3);
            case '6M':
                return sortedData.slice(-6);
            case 'YTD': {
                const currentYear = new Date().getFullYear();
                return sortedData.filter(d => new Date(d.month_start).getFullYear() === currentYear);
            }
            case 'ALL':
            default:
                return sortedData;
        }
    }, [data, filter]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-[250px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs">No trend data yet</p>
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
            {/* Filter Bar */}
            <div className="flex justify-end gap-1 mb-2">
                {(['3M', '6M', 'YTD', 'ALL'] as const).map((key) => (
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

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="month"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                        <Area
                            type="monotone"
                            dataKey="total"
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