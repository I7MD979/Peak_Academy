"use client";

import AdminFilterTabs from "@/components/admin/AdminFilterTabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import DataTable from "@/components/admin/DataTable";
import StatsCard from "@/components/admin/StatsCard";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { Select } from "@/components/ui/Select";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  teacherBtnPrimary,
  teacherBtnSecondary,
  teacherCardSolid,
  teacherErrorBox,
  teacherInput,
  teacherMuted
} from "@/lib/teacher-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

const WITHDRAW_METHOD_OPTIONS = [
  { value: "instapay", label: "إنستاباي" },
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "bank_transfer", label: "تحويل بنكي" }
];

export default function TeacherEarningsPage({
  summary,
  earnings = [],
  withdrawals = [],
  mainTab = "earnings",
  onMainTabChange,
  earningsStatus = "all",
  onEarningsStatusChange,
  earningsStatusTabs = [],
  withdrawalStatus = "all",
  onWithdrawalStatusChange,
  withdrawalStatusTabs = [],
  earningsPage = 1,
  earningsTotalPages = 1,
  earningsTotal = 0,
  onEarningsPageChange,
  withdrawalsPage = 1,
  withdrawalsTotalPages = 1,
  withdrawalsTotal = 0,
  onWithdrawalsPageChange,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  onClearDates,
  earningsColumns = [],
  withdrawalColumns = [],
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  minWithdrawal = 50,
  withdrawAmount = "",
  onWithdrawAmountChange,
  withdrawMethod = "instapay",
  onWithdrawMethodChange,
  withdrawBank = "",
  onWithdrawBankChange,
  bankOptions = [],
  withdrawAccount = "",
  onWithdrawAccountChange,
  fieldErrors = {},
  onFillMaxWithdraw,
  onSubmitWithdrawal,
  withdrawing = false
}) {
  const available = summary?.available_balance ?? 0;
  const hasDateFilter = Boolean(dateFrom || dateTo);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="أرباحي"
        title="متابعة الأرباح وطلبات السحب"
        subtitle="راقب أرباح جلساتك، اطلب سحب الرصيد المتاح، وتابع حالة كل طلب بشكل واضح."
        actions={[
          {
            label: refreshing ? "جاري التحديث…" : "تحديث",
            icon: "refresh",
            variant: "secondary",
            onClick: onRefresh,
            disabled: refreshing || loading
          },
          {
            label: "تحليلاتي",
            icon: "barChart",
            variant: "secondary",
            href: "/teacher/analytics"
          }
        ]}
      />

      {error ? <div className={teacherErrorBox}>{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !summary ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              variant="dark"
              title="إجمالي الأرباح"
              value={formatCurrencyEgp(summary?.total_earnings)}
              iconName="wallet"
              tone="blue"
              hint="منذ بداية الحساب"
            />
            <StatsCard
              variant="dark"
              title="رصيد متاح للسحب"
              value={formatCurrencyEgp(summary?.available_balance)}
              iconName="check"
              tone="success"
              hint="بعد خصم الطلبات المعلقة"
            />
            <StatsCard
              variant="dark"
              title="أرباح هذا الشهر"
              value={formatCurrencyEgp(summary?.this_month_earnings)}
              iconName="trending"
              tone="accent"
              hint="من أول الشهر"
            />
            <StatsCard
              variant="dark"
              title="تم سحبه"
              value={formatCurrencyEgp(summary?.withdrawn_total)}
              iconName="bank"
              tone="warning"
              hint={`${(summary?.pending_withdrawal_count ?? 0).toLocaleString("ar-EG")} طلب معلق`}
            />
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={onSubmitWithdrawal} className={cn(teacherCardSolid, "space-y-4 p-5 xl:col-span-1")}>
          <h2 className="text-lg font-black text-auth-on-surface">طلب سحب جديد</h2>

          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <p className="text-xs font-semibold text-auth-on-surface-variant">الرصيد المتاح للسحب</p>
            <p className="mt-1 text-2xl font-black text-success">{formatCurrencyEgp(available)}</p>
          </div>

          <p className={cn("text-xs", teacherMuted)}>مدة المعالجة المتوقعة: 3–5 أيام عمل</p>
          {summary?.locked_in_withdrawals > 0 ? (
            <p className="text-xs font-semibold text-warning">
              محجوز في طلبات قيد المراجعة: {formatCurrencyEgp(summary.locked_in_withdrawals)}
            </p>
          ) : null}

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="withdraw_amount" className="text-xs font-bold text-auth-on-surface-variant">
                  المبلغ (جنيه)
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-peak-orange hover:underline disabled:opacity-50"
                  onClick={onFillMaxWithdraw}
                  disabled={available < minWithdrawal}
                >
                  سحب كامل الرصيد
                </button>
              </div>
              <input
                id="withdraw_amount"
                type="number"
                min={minWithdrawal}
                value={withdrawAmount}
                onChange={onWithdrawAmountChange}
                placeholder={`الحد الأدنى ${minWithdrawal} جنيه`}
                disabled={available < minWithdrawal}
                className={cn(teacherInput, fieldErrors.amount && "border-danger focus:border-danger focus:ring-danger/30")}
              />
              {fieldErrors.amount ? (
                <p className="text-xs font-semibold text-danger">{fieldErrors.amount}</p>
              ) : (
                <p className={cn("text-xs", teacherMuted)}>الحد الأدنى: {minWithdrawal} جنيه</p>
              )}
            </div>

            <Select
              variant="dark"
              label="طريقة السحب"
              value={withdrawMethod}
              onChange={onWithdrawMethodChange}
              options={WITHDRAW_METHOD_OPTIONS}
              aria-label="طريقة السحب"
            />

            {withdrawMethod === "bank_transfer" ? (
              <Select
                variant="dark"
                label="اسم البنك"
                value={withdrawBank}
                onChange={onWithdrawBankChange}
                options={[{ value: "", label: "اختر البنك" }, ...bankOptions]}
                error={fieldErrors.bank}
                aria-label="اسم البنك"
              />
            ) : null}

            <div className="space-y-1">
              <label htmlFor="withdraw_account" className="text-xs font-bold text-auth-on-surface-variant">
                رقم الحساب / المحفظة
              </label>
              <input
                id="withdraw_account"
                value={withdrawAccount}
                onChange={onWithdrawAccountChange}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className={cn(
                  teacherInput,
                  "text-start",
                  fieldErrors.account && "border-danger focus:border-danger focus:ring-danger/30"
                )}
              />
              {fieldErrors.account ? (
                <p className="text-xs font-semibold text-danger">{fieldErrors.account}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={withdrawing || available < minWithdrawal}
              className={cn(teacherBtnPrimary, "w-full py-3 disabled:opacity-60")}
            >
              {withdrawing ? "جاري الإرسال…" : "إرسال طلب السحب"}
            </button>

            {available < minWithdrawal ? (
              <p className={cn("text-center text-xs", teacherMuted)}>
                لا يوجد رصيد كافٍ (الحد الأدنى {minWithdrawal} جنيه). أكمل جلسات مدفوعة لزيادة رصيدك.
              </p>
            ) : null}
          </div>
        </form>

        <section className={cn(teacherCardSolid, "overflow-hidden xl:col-span-2")}>
          <div className="space-y-4 border-b border-auth-outline-variant/20 bg-auth-surface-low/80 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "earnings", label: "سجل الأرباح" },
                { key: "withdrawals", label: "طلبات السحب" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onMainTabChange?.(tab.key)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                    mainTab === tab.key
                      ? "bg-peak-orange text-white shadow-lg shadow-peak-orange/20"
                      : "border border-auth-outline-variant/40 text-auth-on-surface-variant hover:bg-auth-surface-low"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AdminFilterTabs
              tabs={mainTab === "earnings" ? earningsStatusTabs : withdrawalStatusTabs}
              value={mainTab === "earnings" ? earningsStatus : withdrawalStatus}
              onChange={mainTab === "earnings" ? onEarningsStatusChange : onWithdrawalStatusChange}
            />

            <div className="flex flex-wrap items-end gap-3">
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="من تاريخ"
                value={dateFrom}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                placeholder="بداية الفترة"
              />
              <CustomDatePicker
                variant="dark"
                className="w-44"
                label="إلى تاريخ"
                value={dateTo}
                onChange={(e) => onDateToChange?.(e.target.value)}
                placeholder="نهاية الفترة"
              />
              {hasDateFilter ? (
                <button type="button" className={cn(teacherBtnSecondary, "h-11 px-4 text-xs")} onClick={onClearDates}>
                  مسح التاريخ
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-auth-on-surface-variant">
              النتائج:{" "}
              <span className="font-bold text-peak-orange">
                {(mainTab === "earnings" ? earningsTotal : withdrawalsTotal).toLocaleString("ar-EG")}
              </span>{" "}
              {mainTab === "earnings" ? "سجل" : "طلب"}
            </p>
          </div>

          <div className="p-2">
            <DataTable
              columns={mainTab === "earnings" ? earningsColumns : withdrawalColumns}
              data={mainTab === "earnings" ? earnings : withdrawals}
              loading={loading}
              emptyMessage={mainTab === "earnings" ? "لا توجد أرباح بعد" : "لا توجد طلبات سحب"}
              emptyDescription={
                mainTab === "earnings"
                  ? "ستظهر أرباحك هنا بعد إنهاء الجلسات وتسجيل الحضور."
                  : "عند إرسال طلب سحب سيظهر هنا مع حالته."
              }
              variant="dark"
            />
          </div>

          <AdminPagination
            page={mainTab === "earnings" ? earningsPage : withdrawalsPage}
            totalPages={mainTab === "earnings" ? earningsTotalPages : withdrawalsTotalPages}
            loading={loading}
            totalLabel={
              mainTab === "earnings"
                ? `عرض ${earnings.length} من ${earningsTotal.toLocaleString("ar-EG")} سجل`
                : `عرض ${withdrawals.length} من ${withdrawalsTotal.toLocaleString("ar-EG")} طلب`
            }
            onPrev={() =>
              mainTab === "earnings"
                ? onEarningsPageChange?.(earningsPage - 1)
                : onWithdrawalsPageChange?.(withdrawalsPage - 1)
            }
            onNext={() =>
              mainTab === "earnings"
                ? onEarningsPageChange?.(earningsPage + 1)
                : onWithdrawalsPageChange?.(withdrawalsPage + 1)
            }
            className="rounded-none border-0 border-t border-auth-outline-variant/20 bg-auth-surface-low/50"
          />
        </section>
      </div>
    </div>
  );
}
