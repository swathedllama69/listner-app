"use client"

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type CategoryData = { name: string; value: number; color: string };

// Helper for K/M formatting
const formatCurrencyValue = (val: number, symbol: string) => {
    if (val >= 1000000) return `${symbol}${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}k`;
    return `${symbol}${val.toLocaleString()}`;
};

export function CategoryDonutChart({ data, currencySymbol }: { data: CategoryData[], currencySymbol?: string }) {
    const symbol = currencySymbol || '₦';

    const totalSpent = useMemo(() => {
        return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    }, [data]);

    const chartData = useMemo(() => {
        return data.filter(d => d.value > 0);
    }, [data]);

    if (!chartData || chartData.length === 0 || totalSpent === 0) {
        return (
            <div className="flex items-center justify-center w-full h-[250px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs italic">No spending data available</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percent = ((item.value / totalSpent) * 100).toFixed(1);
            return (
                <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg text-xs z-50">
                    <div className="font-bold text-slate-700">{item.name}</div>
                    <div className="text-slate-500">{formatCurrencyValue(item.value, symbol)} ({percent}%)</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[250px] flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Text */}
            <div className="absolute top-[85px] left-0 right-0 flex flex-col items-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                <span className="text-lg font-black text-slate-800">
                    {formatCurrencyValue(totalSpent, symbol)}
                </span>
            </div>

            {/* Custom Legend to prevent overlapping */}
            <div className="flex flex-wrap justify-center gap-3 px-2 mt-[-10px]">
                {chartData.slice(0, 3).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-medium text-slate-600">
                            {entry.name} {Math.round((entry.value / totalSpent) * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}