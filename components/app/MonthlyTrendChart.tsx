"use client"

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type MonthlyData = { month: string; month_start: string; total: number; };

export function MonthlyTrendChart({ data, currencySymbol }: { data: MonthlyData[], currencySymbol: string }) {
    const [filter, setFilter] = useState<'3M' | '6M' | 'YTD' | 'ALL'>('6M');

    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const now = new Date();
        switch (filter) {
            case '3M': return data.slice(-3);
            case '6M': return data.slice(-6);
            case 'YTD': return data.filter(d => new Date(d.month_start).getFullYear() === now.getFullYear());
            case 'ALL': return data;
            default: return data;
        }
    }, [data, filter]);

    if (!data || data.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-slate-300 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200" style={{ minHeight: '200px' }}>No spending data yet</div>;
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-3 py-2 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl shadow-lg text-xs">
                    <p className="font-bold text-slate-700 mb-0.5">{label}</p>
                    <p className="text-emerald-600 font-mono font-bold text-sm">{currencySymbol}{payload[0].value.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full" style={{ minHeight: '240px' }}>
            <div className="flex items-center justify-end mb-1 gap-1">
                {(['3M', '6M', 'YTD', 'ALL'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all uppercase tracking-wide ${filter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{f}</button>
                ))}
            </div>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            {/* Glow Effect */}
                            <filter id="shadow" height="200%">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.3" />
                            </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            filter="url(#shadow)"
                            activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#059669' }}
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}