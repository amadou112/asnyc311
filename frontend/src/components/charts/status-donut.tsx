"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusCount } from "@/lib/types";
import { useChartTheme } from "@/lib/theme";

const COLOR: Record<string, string> = {
  new: "#3987e5",
  triaged: "#38bdf8",
  in_progress: "#f59e0b",
  pending_inspection: "#9085e9",
  resolved: "#22c55e",
  closed: "#6b7280",
  reopened: "#ef4444",
};

export function StatusDonut({ data }: { data: StatusCount[] }) {
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="key" innerRadius={58} outerRadius={92} paddingAngle={2}>
          {data.map((d) => <Cell key={d.key} fill={COLOR[d.key] ?? "#6b7280"} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 10, color: c.tooltipText }}
          formatter={(v: number, n: string) => [v.toLocaleString(), n.replace(/_/g, " ")]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
