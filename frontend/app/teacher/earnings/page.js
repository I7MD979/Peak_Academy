"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import StatusBadge from "@/components/admin/StatusBadge";
import TeacherEarningsView from "@/components/teacher/TeacherEarningsPage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { dashboardApi, logApiError } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr, formatWithdrawalMethod } from "@/lib/format";

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

const VALID_MAIN_TABS = new Set(["earnings", "withdrawals"]);
const VALID_EARNINGS_STATUS = new Set(earningsStatusTabs.map((t) => t.key));
const VALID_WITHDRAWAL_STATUS = new Set(withdrawalStatusTabs.map((t) => t.key));

function readParams(searchParams) {
  const tab = searchParams.get("tab");
  const earningsStatus = searchParams.get("estatus");
  const withdrawalStatus = searchParams.get("wstatus");
  return {
    mainTab: VALID_MAIN_TABS.has(tab) ? tab : "earnings",
    earningsStatus: VALID_EARNINGS_STATUS.has(earningsStatus) ? earningsStatus : "all",
    withdrawalStatus: VALID_WITHDRAWAL_STATUS.has(withdrawalStatus) ? withdrawalStatus : "all",
    earningsPage: Math.max(Number(searchParams.get("epage")) || 1, 1),
    withdrawalsPage: Math.max(Number(searchParams.get("wpage")) || 1, 1),
    dateFrom: searchParams.get("from") || "",
    dateTo: searchParams.get("to") || ""
  };
}

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

function TeacherEarningsRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => readParams(searchParams), [searchParams]);

  const [summary, setSummary] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [mainTab, setMainTab] = useState(initial.mainTab);
  const [earningsStatus, setEarningsStatus] = useState(initial.earningsStatus);
  const [withdrawalStatus, setWithdrawalStatus] = useState(initial.withdrawalStatus);
  const [earningsPage, setEarningsPage] = useState(initial.earningsPage);
  const [withdrawalsPage, setWithdrawalsPage] = useState(initial.withdrawalsPage);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);

  const [earningsTotalPages, setEarningsTotalPages] = useState(1);
  const [withdrawalsTotalPages, setWithdrawalsTotalPages] = useState(1);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("instapay");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const available = summary?.available_balance ?? 0;

  const syncUrl = useCallback(
    (state) => {
      const params = new URLSearchParams();
      if (state.mainTab !== "earnings") params.set("tab", state.mainTab);
      if (state.earningsStatus !== "all") params.set("estatus", state.earningsStatus);
      if (state.withdrawalStatus !== "all") params.set("wstatus", state.withdrawalStatus);
      if (state.earningsPage > 1) params.set("epage", String(state.earningsPage));
      if (state.withdrawalsPage > 1) params.set("wpage", String(state.withdrawalsPage));
      if (state.dateFrom) params.set("from", state.dateFrom);
      if (state.dateTo) params.set("to", state.dateTo);
      const qs = params.toString();
      router.replace(qs ? `/teacher/earnings?${qs}` : "/teacher/earnings", { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl({ mainTab, earningsStatus, withdrawalStatus, earningsPage, withdrawalsPage, dateFrom, dateTo });
  }, [mainTab, earningsStatus, withdrawalStatus, earningsPage, withdrawalsPage, dateFrom, dateTo, syncUrl]);

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
      if (dateFrom) {
        earningsParams.set("from", dateFrom);
        withdrawalsParams.set("from", dateFrom);
      }
      if (dateTo) {
        earningsParams.set("to", dateTo);
        withdrawalsParams.set("to", dateTo);
      }

      const [summaryRes, earningsRes, withdrawalsRes] = await Promise.all([
        dashboardApi.teacherEarningsSummary(),
        dashboardApi.teacherEarnings(earningsParams.toString()),
        dashboardApi.teacherWithdrawals(withdrawalsParams.toString())
      ]);

      setSummary(summaryRes?.data || null);
      setEarnings(earningsRes?.data || []);
      setEarningsTotalPages(earningsRes?.pagination?.totalPages || 1);
      setEarningsTotal(earningsRes?.pagination?.total || 0);
      setWithdrawals(withdrawalsRes?.data || []);
      setWithdrawalsTotalPages(withdrawalsRes?.pagination?.totalPages || 1);
      setWithdrawalsTotal(withdrawalsRes?.pagination?.total || 0);
    } catch (err) {
      logApiError("teacher/earnings", err);
      setSummary(null);
      setEarnings([]);
      setWithdrawals([]);
      setError(err.message || "تعذر تحميل بيانات الأرباح");
    } finally {
      setLoading(false);
    }
  }, [earningsPage, earningsStatus, withdrawalsPage, withdrawalStatus, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
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
          withdrawMethod === "bank_transfer" && bankLabel ? `بنك: ${bankLabel}` : undefined
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

  const earningsColumns = useMemo(
    () => [
      {
        key: "session",
        label: "الجلسة",
        render: (row) => (
          <div>
            <p className="font-bold text-on-surface">{row.session?.title || "جلسة تعليمية"}</p>
            {row.session?.scheduled_at ? (
              <p className="text-xs text-on-surface-variant">{formatDateTimeAr(row.session.scheduled_at)}</p>
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
    ],
    []
  );

  const withdrawalColumns = useMemo(
    () => [
      {
        key: "requested_at",
        label: "تاريخ الطلب",
        render: (row) => formatDateTimeAr(row.requested_at)
      },
      {
        key: "amount",
        label: "المبلغ",
        render: (row) => <span className="font-bold text-md-primary">{formatCurrencyEgp(row.amount)}</span>
      },
      {
        key: "method",
        label: "طريقة السحب",
        render: (row) => formatWithdrawalMethod(row.method)
      },
      {
        key: "account_number",
        label: "الحساب",
        render: (row) => (
          <span dir="ltr" className="font-mono text-xs text-on-surface">
            {row.account_number || "—"}
          </span>
        )
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
        render: (row) => <span className="text-xs text-on-surface-variant">{row.notes || "—"}</span>
      }
    ],
    []
  );

  return (
    <TeacherEarningsView
      summary={summary}
      earnings={earnings}
      withdrawals={withdrawals}
      mainTab={mainTab}
      onMainTabChange={setMainTab}
      earningsStatus={earningsStatus}
      onEarningsStatusChange={(v) => {
        setEarningsPage(1);
        setEarningsStatus(v);
      }}
      earningsStatusTabs={earningsStatusTabs}
      withdrawalStatus={withdrawalStatus}
      onWithdrawalStatusChange={(v) => {
        setWithdrawalsPage(1);
        setWithdrawalStatus(v);
      }}
      withdrawalStatusTabs={withdrawalStatusTabs}
      earningsPage={earningsPage}
      earningsTotalPages={earningsTotalPages}
      earningsTotal={earningsTotal}
      onEarningsPageChange={setEarningsPage}
      withdrawalsPage={withdrawalsPage}
      withdrawalsTotalPages={withdrawalsTotalPages}
      withdrawalsTotal={withdrawalsTotal}
      onWithdrawalsPageChange={setWithdrawalsPage}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={(v) => {
        setEarningsPage(1);
        setWithdrawalsPage(1);
        setDateFrom(v);
      }}
      onDateToChange={(v) => {
        setEarningsPage(1);
        setWithdrawalsPage(1);
        setDateTo(v);
      }}
      onClearDates={() => {
        setEarningsPage(1);
        setWithdrawalsPage(1);
        setDateFrom("");
        setDateTo("");
      }}
      earningsColumns={earningsColumns}
      withdrawalColumns={withdrawalColumns}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={refresh}
      minWithdrawal={MIN_WITHDRAWAL}
      withdrawAmount={withdrawAmount}
      onWithdrawAmountChange={(e) => {
        setWithdrawAmount(e.target.value);
        setFieldErrors((prev) => ({ ...prev, amount: "" }));
      }}
      withdrawMethod={withdrawMethod}
      onWithdrawMethodChange={(e) => {
        setWithdrawMethod(e.target.value);
        if (e.target.value !== "bank_transfer") setWithdrawBank("");
      }}
      withdrawBank={withdrawBank}
      onWithdrawBankChange={(e) => {
        setWithdrawBank(e.target.value);
        setFieldErrors((prev) => ({ ...prev, bank: "" }));
      }}
      bankOptions={EGYPTIAN_BANKS}
      withdrawAccount={withdrawAccount}
      onWithdrawAccountChange={(e) => {
        setWithdrawAccount(e.target.value);
        setFieldErrors((prev) => ({ ...prev, account: "" }));
      }}
      fieldErrors={fieldErrors}
      onFillMaxWithdraw={fillMaxWithdraw}
      onSubmitWithdrawal={onSubmitWithdrawal}
      withdrawing={withdrawing}
    />
  );
}

export default function TeacherEarningsPage() {
  return (
    <Suspense fallback={<SectionLoader message="جاري تحميل الأرباح..." />}>
      <TeacherEarningsRoute />
    </Suspense>
  );
}
