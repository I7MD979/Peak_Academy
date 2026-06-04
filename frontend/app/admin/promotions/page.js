"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { adminPromotionsApi } from "@/lib/api";

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    type: "coupon",
    discount_type: "percent",
    discount_value: 10,
    applies_to: "per_session"
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminPromotionsApi.list("limit=50"),
        adminPromotionsApi.stats()
      ]);
      setPromos(listRes?.data || []);
      setStats(statsRes?.data || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await adminPromotionsApi.create(form);
    setForm({ ...form, code: "" });
    load();
  };

  const toggleActive = async (row) => {
    await adminPromotionsApi.update(row.id, { is_active: !row.is_active });
    load();
  };

  if (loading) {
    return (
      <main className="p-4 md:p-6">
        <LoadingSkeleton />
      </main>
    );
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-black text-text">إدارة العروض والخصومات</h1>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-text-muted">عروض نشطة</p>
            <p className="text-2xl font-black">{stats.active_promotions}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-text-muted">مرات الاستخدام</p>
            <p className="text-2xl font-black">{stats.total_uses}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-text-muted">إجمالي الخصم</p>
            <p className="text-2xl font-black">{stats.total_discount_given?.toLocaleString("ar-EG")} ج.م</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
        <Input
          placeholder="كود العرض"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <select
          className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          value={form.discount_type}
          onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
        >
          <option value="percent">نسبة مئوية</option>
          <option value="fixed">مبلغ ثابت</option>
          <option value="free_session">حصة مجانية</option>
        </select>
        <Input
          type="number"
          placeholder="قيمة الخصم"
          value={form.discount_value}
          onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
        />
        <Button type="submit" variant="accent" className="rounded-xl md:col-span-3">
          إنشاء عرض
        </Button>
      </form>

      <Button
        variant="outline"
        className="rounded-xl"
        onClick={async () => {
          await adminPromotionsApi.activateEarlyBird({ discount_percent: 20, hours: 72 });
          load();
        }}
      >
        تفعيل Early Bird (72 ساعة)
      </Button>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-text-muted">
              <th className="p-3">الكود</th>
              <th className="p-3">النوع</th>
              <th className="p-3">الخصم</th>
              <th className="p-3">الاستخدام</th>
              <th className="p-3">نشط</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {promos.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="p-3 font-bold">{row.code}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3">
                  {row.discount_value}
                  {row.discount_type === "percent" ? "%" : " ج.م"}
                </td>
                <td className="p-3">
                  {row.used_count}
                  {row.max_uses ? ` / ${row.max_uses}` : ""}
                </td>
                <td className="p-3">{row.is_active ? "نعم" : "لا"}</td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>
                    {row.is_active ? "إيقاف" : "تفعيل"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
