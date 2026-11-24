"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const TIP = { contentStyle: { background: "#121E35", border: "1px solid #1E2D4D", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "#94A3B8" } };

export function TrendChart({ data, a, b }: { data: Record<string, unknown>[]; a: string; b?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1E2D4D" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip {...TIP} />
        <Area type="monotone" dataKey={a} stroke="#3B82F6" fill="url(#ga)" strokeWidth={2} />
        {b && <Area type="monotone" dataKey={b} stroke="#B8FF3C" fill="none" strokeWidth={1.5} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, nameKey = "value", valKey = "sessions", color = "#3B82F6" }: { data: Record<string, unknown>[]; nameKey?: string; valKey?: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey={nameKey} width={130} tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip {...TIP} />
        <Bar dataKey={valKey} fill={color} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PALETTE = ["#3B82F6", "#B8FF3C", "#60A5FA", "#F59E0B", "#A78BFA", "#34D399", "#F472B6", "#94A3B8"];

export function Donut({ data, nameKey = "value", valKey = "sessions" }: { data: Record<string, unknown>[]; nameKey?: string; valKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey={valKey} nameKey={nameKey} innerRadius={56} outerRadius={80} paddingAngle={2} strokeWidth={0}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...TIP} />
      </PieChart>
    </ResponsiveContainer>
  );
}
