"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrencyEgp } from "@/lib/format";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-bold text-text">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-text-muted" style={{ color: entry.color }}>
          {entry.name}: {formatCurrencyEgp(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function RevenueChart({ data = [], loading }) {
  if (loading) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
        <p className="text-sm text-text-muted">جاري تحميل الرسم البياني...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
        <p className="text-sm text-text-muted">لا توجد بيانات للفترة المحددة</p>
      </div>
    );
  }

  return (
    <div className="h-[320px] min-h-[320px] w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height={320} minHeight={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }}
            tickFormatter={(v) => `${Number(v).toLocaleString("ar-EG")}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-text-muted">{value}</span>}
          />
          <Bar dataKey="revenue" name="إيرادات المنصة" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={48} />
          <Bar dataKey="withdrawn" name="المسحوبات" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
