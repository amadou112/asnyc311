"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BoroughStat } from "@/lib/types";
import { useChartTheme } from "@/lib/theme";

const COLORS = ["#3987e5", "#22c55e", "#d55181", "#f59e0b", "#9085e9"];

export function BoroughBar({ data }: { data: BoroughStat[] }) {
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="borough" width={92}
          tick={{ fill: c.label, fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(b: string) => b.charAt(0) + b.slice(1).toLowerCase()} />
        <Tooltip
          cursor={{ fill: c.cursor }}
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 10, color: c.tooltipText }}
        />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} name="Total requests">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
