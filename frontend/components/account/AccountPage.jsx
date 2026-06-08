"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { accountApi } from "@/lib/api";
import { formatDateAr, formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const SECTION_CARD = "rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4";
const INPUT_CLS = "h-11 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors";
const LABEL_CLS = "text-xs font-bold text-text-muted mb-1.5 block";
const BTN_PRIMARY = "inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50";
const BTN_SECONDARY = "inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-text transition hover:bg-bg disabled:opacity-50";
const BTN_DANGER = "inline-flex items-center justify-center rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-danger/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50";

const SUB_STATUS = {
  active: { label: "نشط", cls: "bg-success/15 text-success" },
  expired: { label: "منتهي", cls: "bg-bg text-text-muted" },
  frozen: { label: "مجمّد", cls: "bg-accent-blue/15 text-accent-blue" },
  cancelled: { label: "ملغي", cls: "bg-danger/15 text-danger" }
};

// ── Profile section ───────────────────────────────────────────────────────────
function ProfileSection({ user }) {
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const isDirty =
    name.trim() !== (user?.full_name || "").trim() ||
    phone.trim() !== (user?.phone || "").trim();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      await accountApi.updateProfile({ full_name: name.trim(), phone: phone.trim() || null });
      toast.success("تم تحديث الملف الشخصي");
    } catch (err) {
      toast.error(err.message || "تعذر حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={SECTION_CARD}>
      <h2 className="text-base font-bold text-text">الملف الشخصي</h2>
      <form onSubmit={handleSave} className="space-y-4" noValidate>
        <div>
          <label className={LABEL_CLS} htmlFor="acc-name">الاسم الكامل</label>
          <input id="acc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} placeholder="اسمك الكامل" maxLength={100} required />
        </div>
        <div>
          <label className={LABEL_CLS} htmlFor="acc-email">البريد الإلكتروني</label>
          <input id="acc-email" type="email" value={user?.email || ""} className={cn(INPUT_CLS, "opacity-60")} readOnly />
          <p className="mt-1 text-xs text-text-muted">لا يمكن تغيير البريد الإلكتروني من هنا.</p>
        </div>
        <div>
          <label className={LABEL_CLS} htmlFor="acc-phone">
            رقم الهاتف <span className="font-normal text-text-muted/60">(اختياري)</span>
          </label>
          <input id="acc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT_CLS} placeholder="01xxxxxxxxx" dir="ltr" maxLength={20} />
        </div>
        <button type="submit" className={BTN_PRIMARY} disabled={saving || !isDirty}>
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </section>
  );
}

// ── Activity section ──────────────────────────────────────────────────────────
function ActivitySection({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountApi.activity()
      .then((res) => setData(res?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <section className={SECTION_CARD}>
      <h2 className="text-base font-bold text-text">نشاط الحساب</h2>
      {loading ? (
        <p className="text-sm text-text-muted">جارٍ التحميل...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-2xl font-black text-accent">{data?.total_enrollments || 0}</p>
            <p className="mt-0.5 text-xs text-text-muted">إجمالي التسجيلات</p>
          </div>
          {data?.active_subscription ? (
            <div className="col-span-2 rounded-xl bg-success/5 border border-success/20 p-3">
              <p className="text-xs font-bold text-success">اشتراك نشط</p>
              <p className="mt-0.5 text-sm font-bold text-text">
                {data.active_subscription.sessions_remaining} حصة متبقية
              </p>
              {data.active_subscription.current_period_end ? (
                <p className="text-xs text-text-muted">
                  ينتهي {formatDateAr(data.active_subscription.current_period_end)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

// ── Subscriptions section ─────────────────────────────────────────────────────
function SubscriptionsSection() {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountApi.subscriptions()
      .then((res) => setSubs(res?.data || []))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className={SECTION_CARD}><p className="text-sm text-text-muted">جارٍ تحميل الاشتراكات...</p></section>;
  if (!subs?.length) return null;

  return (
    <section className={SECTION_CARD}>
      <h2 className="text-base font-bold text-text">اشتراكاتي</h2>
      <div className="divide-y divide-border rounded-xl border border-border">
        {subs.map((sub) => {
          const s = SUB_STATUS[sub.status] || { label: sub.status, cls: "bg-bg text-text-muted" };
          return (
            <div key={sub.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-bold text-text">{sub.subscription_plans?.name || "خطة"}</p>
                <p className="text-xs text-text-muted">
                  {sub.sessions_remaining} حصة متبقية
                  {sub.subscription_plans?.price ? ` · ${formatCurrencyEgp(sub.subscription_plans.price)}` : null}
                </p>
                {sub.current_period_end ? (
                  <p className="text-xs text-text-muted">ينتهي {formatDateAr(sub.current_period_end)}</p>
                ) : null}
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", s.cls)}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Danger zone ───────────────────────────────────────────────────────────────
function DangerZone({ onDeleteAccount }) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm.trim() !== "حذف حسابي") {
      toast.error("اكتب 'حذف حسابي' للتأكيد");
      return;
    }
    setDeleting(true);
    try {
      await accountApi.deleteAccount();
      toast.success("تم حذف الحساب. سيتم تسجيل خروجك.");
      onDeleteAccount?.();
    } catch (err) {
      toast.error(err.message || "تعذر حذف الحساب");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5 space-y-3">
      <h2 className="text-base font-bold text-danger">منطقة الخطر</h2>
      <p className="text-sm text-text-muted">
        حذف الحساب يوقف تسجيل دخولك ويوقف جميع الاشتراكات. لا يمكن التراجع بسهولة.
      </p>
      {!expanded ? (
        <button type="button" className={BTN_DANGER} onClick={() => setExpanded(true)}>
          حذف حسابي
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-danger/30 bg-card p-4">
          <p className="text-sm font-bold text-text">اكتب <span className="text-danger font-black">حذف حسابي</span> للتأكيد:</p>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={INPUT_CLS}
            placeholder="حذف حسابي"
          />
          <div className="flex gap-2">
            <button type="button" className={BTN_DANGER} onClick={handleDelete} disabled={deleting}>
              {deleting ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => { setExpanded(false); setConfirm(""); }}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const load = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const res = await accountApi.me();
      setDetail(res?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loadingDetail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-muted">جارٍ تحميل بيانات الحساب...</p>
      </div>
    );
  }

  const profileUser = detail?.user || user;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-black text-text">إعدادات الحساب</h1>
        <p className="mt-1 text-sm text-text-muted">
          تاريخ التسجيل: {profileUser?.created_at ? formatDateAr(profileUser.created_at) : "—"}
        </p>
      </div>

      <ProfileSection user={profileUser} />
      <ActivitySection userId={profileUser?.id} />

      {profileUser?.role === "student" ? <SubscriptionsSection /> : null}

      <DangerZone onDeleteAccount={async () => { await signOut(); }} />
    </div>
  );
}
