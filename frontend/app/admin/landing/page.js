"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { adminApi } from "@/lib/api";

export default function AdminLandingPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getLandingStats();
      setStats(res?.data || []);
    } catch {
      toast.error("تعذر تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function updateStat(id, value) {
    try {
      await adminApi.updateLandingStat(id, { value });
      toast.success("تم التحديث");
      loadStats();
    } catch {
      toast.error("تعذر التحديث");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-primary">إدارة صفحة الهبوط</h1>
        <p className="mt-1 text-sm text-text-muted">تحكم في المحتوى الظاهر للزوار</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 font-bold text-primary">إحصائيات المنصة</h2>
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold">{stat.label}</p>
                <p className="text-xs text-text-muted">{stat.hint}</p>
              </div>
              <input
                className="w-32 rounded-lg border border-border px-3 py-1.5 text-center text-sm font-bold"
                defaultValue={stat.value}
                onBlur={(e) => {
                  if (e.target.value !== stat.value) {
                    updateStat(stat.id, e.target.value);
                  }
                }}
              />
              <div className="w-20 text-center">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    stat.is_visible ? "bg-success/10 text-success" : "bg-border text-text-muted"
                  }`}
                >
                  {stat.is_visible ? "ظاهر" : "مخفي"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-primary">خطط الاشتراك</h2>
          <Link href="/admin/promotions" className="text-sm text-accent hover:underline">
            إدارة العروض ←
          </Link>
        </div>
        <p className="text-sm text-text-muted">
          الخطط تُدار من جدول subscription_plans في قاعدة البيانات وتظهر تلقائياً على صفحة الهبوط.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-primary">أكواد الخصم على الـ Landing</h2>
          <Link href="/admin/promotions" className="text-sm text-accent hover:underline">
            إدارة العروض ←
          </Link>
        </div>
        <p className="text-sm text-text-muted">
          الأكواد النشطة بدون تاريخ انتهاء (أو لم تنتهِ بعد) تظهر تلقائياً كأمثلة على صفحة الهبوط.
        </p>
      </div>
    </div>
  );
}
