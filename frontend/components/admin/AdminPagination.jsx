import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminCardSolid, adminMuted } from "@/lib/admin-styles";

export default function AdminPagination({
  page,
  totalPages,
  totalLabel,
  loading,
  onPrev,
  onNext,
  className
}) {
  const safeTotal = Math.max(1, totalPages);

  return (
    <section
      className={cn(
        adminCardSolid,
        "flex flex-wrap items-center justify-between gap-3 p-4 text-sm",
        className
      )}
    >
      {totalLabel ? <p className={adminMuted}>{totalLabel}</p> : <span />}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-auth-outline-variant/50 bg-auth-surface-highest text-auth-on-surface hover:bg-auth-surface-bright"
          onClick={onPrev}
          disabled={page <= 1 || loading}
        >
          السابق
        </Button>
        <span className={cn("min-w-24 text-center font-semibold", adminMuted)}>
          صفحة {page} من {safeTotal}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-auth-outline-variant/50 bg-auth-surface-highest text-auth-on-surface hover:bg-auth-surface-bright"
          onClick={onNext}
          disabled={page >= safeTotal || loading}
        >
          التالي
        </Button>
      </div>
    </section>
  );
}
