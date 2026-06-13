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
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { chart, md3 } from "@/lib/design-tokens";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

function ChartTooltip({ active, payload, label, variant }) {
  if (!active || !payload?.length) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-sm shadow-lg",
        isDark
          ? "border-outline-variant bg-surface-container-high text-on-surface"
          : "border-outline-variant/40 bg-surface-container text-on-surface"
      )}
    >
      <p className={cn("mb-1 font-bold", isDark ? "text-on-surface" : "text-on-surface")}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatCurrencyEgp(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function RevenueChart({ data = [], loading, variant = "dark" }) {
  const isDark = variant === "dark";
  const tickColor = isDark ? md3.onSurfaceVariant : "#64748b";
  const gridColor = isDark ? "rgba(88, 66, 53, 0.4)" : "#e2e8f0";

  if (loading) {
    return (
      <div
        className={cn(
          "flex h-[320px] items-center justify-center rounded-xl border border-dashed",
          isDark ? "border-outline-variant bg-surface-container-low/50" : "border-outline-variant/40 bg-surface-container-low/50"
        )}
      >
        <SectionLoader message="جاري تحميل الرسم البياني..." />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        className={cn(
          "flex h-[320px] items-center justify-center rounded-xl border border-dashed",
          isDark ? "border-outline-variant bg-surface-container-low/30" : "border-outline-variant/40 bg-muted/30"
        )}
      >
        <p className={cn("text-sm", isDark ? "text-on-surface-variant" : "text-on-surface-variant")}>
          لا توجد بيانات للفترة المحددة
        </p>
      </div>
    );
  }

  return (
    <div className="h-[320px] min-h-[320px] w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height={320} minHeight={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            tickFormatter={(v) => `${Number(v).toLocaleString("ar-EG")}`}
          />
          <Tooltip content={<ChartTooltip variant={variant} />} />
          <Legend
            formatter={(value) => (
              <span className={cn("text-xs", isDark ? "text-on-surface-variant" : "text-on-surface-variant")}>
                {value}
              </span>
            )}
          />
          <Bar dataKey="revenue" name="إيرادات المنصة" fill={chart.green} radius={[6, 6, 0, 0]} maxBarSize={48} />
          <Bar dataKey="withdrawn" name="المسحوبات" fill={chart.blue} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
