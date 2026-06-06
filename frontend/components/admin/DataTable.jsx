import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    wrapper: "rounded-2xl border border-border bg-card",
    head: "border-b border-border bg-bg",
    th: "text-text-muted",
    row: "border-b border-border hover:bg-bg/70",
    td: "text-text"
  },
  dark: {
    wrapper: "rounded-xl border border-outline-variant bg-surface-container",
    head: "border-b border-outline-variant/30 bg-surface-container-high/50",
    th: "text-on-surface-variant",
    row: "border-b border-outline-variant/20 hover:bg-surface-container-high/40",
    td: "text-on-surface"
  }
};

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage,
  emptyDescription,
  getRowClassName,
  variant = "dark"
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.dark;

  if (loading) {
    return (
      <div className={cn(styles.wrapper, "p-4")}>
        <TableSkeleton />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className={cn(styles.wrapper, "p-2")}>
        <EmptyState title={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", styles.wrapper)}>
      <table className="w-full min-w-[900px] text-sm">
        <thead className={styles.head}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 text-right font-semibold", styles.th)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id || row._key}
              className={cn("transition-colors last:border-0", styles.row, getRowClassName?.(row))}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3",
                    styles.td,
                    col.key === "actions" && "min-w-[300px] whitespace-nowrap"
                  )}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
