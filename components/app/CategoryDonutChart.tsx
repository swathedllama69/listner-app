"use client"

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type CategoryData = { name: string; value: number; color: string };

export function CategoryDonutChart({ data, currencySymbol }: { data: CategoryData[], currencySymbol?: string }) {
    const symbol = currencySymbol || '₦';

    // Memoize total to prevent recalc on every render
    const totalSpent = useMemo(() => {
        return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    }, [data]);

    // Safety: If no data or 0 total, show empty state immediately
    if (!data || totalSpent === 0) {
        return (
            <div className="flex items-center justify-center w-full h-[250px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs italic">No spending data available</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0];
            const percentage = ((item.value / totalSpent) * 100).toFixed(1);
            return (
                <div className="px-3 py-2 bg-white/95 border border-slate-100 shadow-xl rounded-lg text-xs z-50">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.fill }} />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">{symbol}{item.value.toLocaleString()}</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{percentage}%</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        cornerRadius={4}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />

                    {/* Centered Total Text */}
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                        <tspan x="50%" dy="-10" className="text-[10px] font-bold fill-slate-400 uppercase tracking-widest">Total</tspan>
                        <tspan x="50%" dy="22" className="text-lg font-black fill-slate-800">{symbol}{(totalSpent / 1000).toFixed(1)}k</tspan>
                    </text>
                </PieChart>
            </ResponsiveContainer>

            {/* Static Legend below chart */}
            <div className="flex flex-wrap justify-center gap-2 mt-[-10px] px-2">
                {data.slice(0, 3).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-md shadow-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">{entry.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}