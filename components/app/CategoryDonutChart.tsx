"use client"

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type CategoryData = { name: string; value: number; color: string };

export function CategoryDonutChart({ data, currencySymbol }: { data: CategoryData[], currencySymbol?: string }) {
    const symbol = currencySymbol || '₦';
    const totalSpent = data.reduce((sum, item) => sum + item.value, 0);

    if (totalSpent === 0) {
        return <div className="flex items-center justify-center text-slate-300 text-xs italic w-full h-[200px]">No spending data.</div>;
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0];
            const percentage = ((item.value / totalSpent) * 100).toFixed(1);
            return (
                <div className="px-3 py-2 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl shadow-lg text-xs">
                    <p className="font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.fill }}></span>
                        {item.name}
                    </p>
                    <p className="text-slate-500">{symbol}{item.value.toLocaleString()} <span className="text-slate-300">|</span> <span className="font-medium text-slate-700">{percentage}%</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        // Chart Jank Fix: Apply hardware acceleration and containment styles to the container
        <div className="flex flex-col w-full h-[250px]" style={{ willChange: 'transform', contain: 'layout paint' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        cornerRadius={6}
                        stroke="white"
                        strokeWidth={2}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />

                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                        <tspan x="50%" dy="-0.8em" className="text-[10px] font-bold fill-slate-400 uppercase tracking-widest">Total</tspan>
                        <tspan x="50%" dy="1.4em" className="text-xl font-extrabold fill-slate-800">{symbol}{(totalSpent / 1000).toFixed(1)}k</tspan>
                    </text>
                </PieChart>
            </ResponsiveContainer>

            {/* Compact Legend */}
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {data.slice(0, 4).map((entry) => (
                    <div key={entry.name} className="flex items-center text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                        <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></div>
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
    );
}