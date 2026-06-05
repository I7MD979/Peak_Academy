"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/admin/StatsCard";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import ErrorState from "@/components/shared/ErrorState";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { dashboardApi, logApiError } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr, formatWithdrawalMethod } from "@/lib/format";
import { cn } from "@/lib/utils";

const MIN_WITHDRAWAL = 50;

const EGYPTIAN_BANKS = [
  { value: "nbe", label: "البنك الأهلي المصري" },
  { value: "cib", label: "بنك CIB" },
  { value: "qnb", label: "بنك QNB الأهلي" },
  { value: "banque_misr", label: "بنك مصر" },
  { value: "aaib", label: "بنك العربي الأفريقي" },
  { value: "adib", label: "بنك أبوظبي الإسلامي" },
  { value: "other", label: "بنك آخر" }
];

const mainTabs = [
  { key: "earnings", label: "سجل الأرباح" },
  { key: "withdrawals", label: "طلبات السحب" }
];

const earningsStatusTabs = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد التحويل" },
  { key: "paid", label: "تم التحويل" }
];

const withdrawalStatusTabs = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "معلقة" },
  { key: "approved", label: "مقبولة" },
  { key: "paid", label: "مدفوعة" },
  { key: "rejected", label: "مرفوضة" }
];

function validateWithdrawForm(amount, account, available, method, bankName) {
  const errors = {};
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    errors.amount = "أدخل مبلغًا صحيحًا";
  } else if (value < MIN_WITHDRAWAL) {
    errors.amount = `الحد الأدنى للسحب ${MIN_WITHDRAWAL} جنيه`;
  } else if (value > available) {
    errors.amount = "المبلغ أكبر من الرصيد المتاح";
  }

  if (!account.trim() || account.trim().length < 6) {
    errors.account = "أدخل رقم حساب أو محفظة صحيحًا";
  }

  if (method === "bank_transfer" && !bankName) {
    errors.bank = "اختر اسم البنك";
  }

  return errors;
}

export default function TeacherEarningsPage() {
  const [summary, setSummary] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [mainTab, setMainTab] = useState("earnings");
  const [earningsStatus, setEarningsStatus] = useState("all");
  const [withdrawalStatus, setWithdrawalStatus] = useState("all");

  const [earningsPage, setEarningsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [earningsTotalPages, setEarningsTotalPages] = useState(1);
  const [withdrawalsTotalPages, setWithdrawalsTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("instapay");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const available = summary?.available_balance ?? 0;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const earningsParams = new URLSearchParams({
        page: String(earningsPage),
        limit: "10",
        status: earningsStatus
      });
      const withdrawalsParams = new URLSearchParams({
        page: String(withdrawalsPage),
        limit: "10",
        status: withdrawalStatus
      });

      const [summaryRes, earningsRes, withdrawalsRes] = await Promise.all([
        dashboardApi.teacherEarningsSummary(),
        dashboardApi.teacherEarnings(earningsParams.toString()),
        dashboardApi.teacherWithdrawals(withdrawalsParams.toString())
      ]);

      setSummary(summaryRes?.data || null);
      setEarnings(earningsRes?.data || []);
      setEarningsTotalPages(earningsRes?.pagination?.totalPages || 1);
      setWithdrawals(withdrawalsRes?.data || []);
      setWithdrawalsTotalPages(withdrawalsRes?.pagination?.totalPages || 1);
    } catch (err) {
      logApiError("teacher/earnings", err);
      setSummary(null);
      setEarnings([]);
      setWithdrawals([]);
      setError(err.message || "تعذر تحميل بيانات الأرباح");
    } finally {
      setLoading(false);
    }
  }, [earningsPage, earningsStatus, withdrawalsPage, withdrawalStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmitWithdrawal = async (e) => {
    e.preventDefault();
    const errors = validateWithdrawForm(
      withdrawAmount,
      withdrawAccount,
      available,
      withdrawMethod,
      withdrawBank
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("يرجى مراجعة بيانات طلب السحب");
      return;
    }

    try {
      setWithdrawing(true);
      setFieldErrors({});
      const bankLabel = EGYPTIAN_BANKS.find((b) => b.value === withdrawBank)?.label;
      await dashboardApi.teacherRequestWithdrawal({
        amount: Number(withdrawAmount),
        method: withdrawMethod,
        account_number: withdrawAccount.trim(),
        notes:
          withdrawMethod === "bank_transfer" && bankLabel
            ? `بنك: ${bankLabel}`
            : undefined
      });
      toast.success("تم إرسال طلب السحب بنجاح");
      setWithdrawAmount("");
      setWithdrawAccount("");
      setWithdrawalsPage(1);
      setMainTab("withdrawals");
      await loadData();
    } catch (err) {
      toast.error(err.message || "تعذر إرسال طلب السحب");
    } finally {
      setWithdrawing(false);
    }
  };

  const fillMaxWithdraw = () => {
    if (available <= 0) return;
    setWithdrawAmount(String(Math.floor(available)));
    setFieldErrors((prev) => ({ ...prev, amount: "" }));
  };

  const earningsColumns = [
    {
      key: "session",
      label: "الجلسة",
      render: (row) => (
        <div>
          <p className="font-bold text-text">{row.session?.title || "جلسة تعليمية"}</p>
          {row.session?.scheduled_at ? (
            <p className="text-xs text-text-muted">{formatDateTimeAr(row.session.scheduled_at)}</p>
          ) : null}
        </div>
      )
    },
    {
      key: "created_at",
      label: "تاريخ الإضافة",
      render: (row) => formatDateTimeAr(row.created_at)
    },
    {
      key: "gross",
      label: "إجمالي الجلسة",
      render: (row) => formatCurrencyEgp(row.gross_amount)
    },
    {
      key: "teacher_amount",
      label: "ربحك",
      render: (row) => <span className="font-bold text-success">{formatCurrencyEgp(row.teacher_amount)}</span>
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) =>
        row.status === "paid" ? (
          <StatusBadge status="paid" />
        ) : (
          <span className="inline-flex rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
            قيد التحويل
          </span>
        )
    }
  ];

  const withdrawalColumns = [
    {
      key: "requested_at",
      label: "تاريخ الطلب",
      render: (row) => formatDateTimeAr(row.requested_at)
    },
    {
      key: "amount",
      label: "المبلغ",
      render: (row) => <span className="font-bold text-accent">{formatCurrencyEgp(row.amount)}</span>
    },
    {
      key: "method",
      label: "طريقة السحب",
      render: (row) => formatWithdrawalMethod(row.method)
    },
    {
      key: "account_number",
      label: "الحساب",
      render: (row) => <span dir="ltr" className="font-mono text-xs">{row.account_number || "—"}</span>
    },
    {
      key: "processed_at",
      label: "تاريخ المعالجة",
      render: (row) => formatDateTimeAr(row.processed_at)
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: "notes",
      label: "ملاحظة",
      render: (row) => <span className="text-xs text-text-muted">{row.notes || "—"}</span>
    }
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">أرباحي</p>
        <h1 className="mt-1 text-2xl font-black">متابعة أرباحك وطلبات السحب</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          راقب أرباح الجلسات، اطلب سحب الرصيد المتاح، وتابع حالة كل طلب بشكل واضح.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
          onClick={loadData}
          disabled={loading}
        >
          تحديث البيانات
        </Button>
      </section>

      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
        <StatsCard
          title="إجمالي الأرباح"
          value={formatCurrencyEgp(summary?.total_earnings)}
          iconName="wallet"
          tone="blue"
          hint="منذ بداية الحساب"
        />
        <StatsCard
          title="رصيد متاح للسحب"
          value={formatCurrencyEgp(summary?.available_balance)}
          iconName="check"
          tone="success"
          hint="بعد خصم الطلبات المعلقة"
        />
        <StatsCard
          title="أرباح هذا الشهر"
          value={formatCurrencyEgp(summary?.this_month_earnings)}
          iconName="trending"
          tone="accent"
          hint="من أول الشهر"
        />
        <StatsCard
          title="تم سحبه"
          value={formatCurrencyEgp(summary?.withdrawn_total)}
          iconName="bank"
          tone="warning"
          hint={`${(summary?.pending_withdrawal_count ?? 0).toLocaleString("ar-EG")} طلب معلق`}
        />
          </>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <form
          onSubmit={onSubmitWithdrawal}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-1"
        >
          <h3 className="text-lg font-black text-text">طلب سحب جديد</h3>
          <div className="mt-2 rounded-xl border border-success/20 bg-success/5 p-3">
            <p className="text-xs text-text-muted">الرصيد المتاح للسحب</p>
            <p className="text-2xl font-black text-success">{formatCurrencyEgp(available)}</p>
          </div>
          <p className="mt-2 text-xs text-text-muted">مدة المعالجة المتوقعة: 3–5 أيام عمل</p>
          {summary?.locked_in_withdrawals > 0 ? (
            <p className="mt-1 text-xs text-warning">
              محجوز في طلبات قيد المراجعة: {formatCurrencyEgp(summary.locked_in_withdrawals)}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="withdraw_amount">المبلغ (جنيه)</Label>
                <button
                  type="button"
                  className="text-xs font-bold text-accent hover:underline"
                  onClick={fillMaxWithdraw}
                  disabled={available < MIN_WITHDRAWAL}
                >
                  سحب كامل الرصيد
                </button>
              </div>
              <Input
                id="withdraw_amount"
                type="number"
                min={MIN_WITHDRAWAL}
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder={`الحد الأدنى ${MIN_WITHDRAWAL} جنيه`}
                disabled={available < MIN_WITHDRAWAL}
              />
              {fieldErrors.amount ? (
                <p className="text-xs font-semibold text-destructive">{fieldErrors.amount}</p>
              ) : (
                <p className="text-xs text-text-muted">الحد الأدنى: {MIN_WITHDRAWAL} جنيه</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="withdraw_method">طريقة السحب</Label>
              <select
                id="withdraw_method"
                value={withdrawMethod}
                onChange={(e) => {
                  setWithdrawMethod(e.target.value);
                  if (e.target.value !== "bank_transfer") setWithdrawBank("");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="instapay">إنستاباي</option>
                <option value="vodafone_cash">فودافون كاش</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
            </div>

            {withdrawMethod === "bank_transfer" ? (
              <div className="space-y-1">
                <Label htmlFor="withdraw_bank">اسم البنك</Label>
                <select
                  id="withdraw_bank"
                  value={withdrawBank}
                  onChange={(e) => {
                    setWithdrawBank(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, bank: "" }));
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">اختر البنك</option>
                  {EGYPTIAN_BANKS.map((bank) => (
                    <option key={bank.value} value={bank.value}>
                      {bank.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.bank ? (
                  <p className="text-xs font-semibold text-destructive">{fieldErrors.bank}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="withdraw_account">رقم الحساب / المحفظة</Label>
              <Input
                id="withdraw_account"
                value={withdrawAccount}
                onChange={(e) => {
                  setWithdrawAccount(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, account: "" }));
                }}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="text-left"
              />
              {fieldErrors.account ? (
                <p className="text-xs font-semibold text-destructive">{fieldErrors.account}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={withdrawing || available < MIN_WITHDRAWAL}
            >
              {withdrawing ? "جارٍ الإرسال..." : "إرسال طلب السحب"}
            </Button>

            {available < MIN_WITHDRAWAL ? (
              <p className="text-center text-xs text-text-muted">
                لا يوجد رصيد كافٍ (الحد الأدنى {MIN_WITHDRAWAL} جنيه). أكمل جلسات مدفوعة لزيادة رصيدك.
              </p>
            ) : null}
          </div>
        </form>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMainTab(tab.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                  mainTab === tab.key
                    ? "bg-primary text-white"
                    : "border border-border bg-bg text-text-muted hover:text-text"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mainTab === "earnings" ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {earningsStatusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setEarningsPage(1);
                      setEarningsStatus(tab.key);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      earningsStatus === tab.key ? "bg-accent/15 text-accent" : "text-text-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <DataTable
                columns={earningsColumns}
                data={earnings.map((row) => ({ ...row, _key: row.id }))}
                loading={loading}
                emptyMessage="لا توجد أرباح بعد"
                emptyDescription="ستظهر أرباحك هنا بعد إنهاء الجلسات وتسجيل الحضور."
              />

              {!loading && earnings.length > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={earningsPage <= 1}
                    onClick={() => setEarningsPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </Button>
                  <span className="text-text-muted">
                    صفحة {earningsPage.toLocaleString("ar-EG")} من {earningsTotalPages.toLocaleString("ar-EG")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={earningsPage >= earningsTotalPages}
                    onClick={() => setEarningsPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {withdrawalStatusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setWithdrawalsPage(1);
                      setWithdrawalStatus(tab.key);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      withdrawalStatus === tab.key ? "bg-accent/15 text-accent" : "text-text-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <DataTable
                columns={withdrawalColumns}
                data={withdrawals.map((row) => ({ ...row, _key: row.id }))}
                loading={loading}
                emptyMessage="لا توجد طلبات سحب"
                emptyDescription="عند إرسال طلب سحب سيظهر هنا مع حالته."
              />

              {!loading && withdrawals.length > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={withdrawalsPage <= 1}
                    onClick={() => setWithdrawalsPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </Button>
                  <span className="text-text-muted">
                    صفحة {withdrawalsPage.toLocaleString("ar-EG")} من{" "}
                    {withdrawalsTotalPages.toLocaleString("ar-EG")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={withdrawalsPage >= withdrawalsTotalPages}
                    onClick={() => setWithdrawalsPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
