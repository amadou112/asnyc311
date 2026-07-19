"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/types";
import { useChartTheme } from "@/lib/theme";

export function TrendArea({ data }: { data: TrendPoint[] }) {
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987e5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3987e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
        <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 10, color: c.tooltipText }}
          labelStyle={{ color: c.label }}
        />
        <Area type="monotone" dataKey="count" stroke="#3987e5" strokeWidth={2.5} fill="url(#g)" name="Requests" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
