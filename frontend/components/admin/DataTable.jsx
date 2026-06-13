import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    wrapper: "rounded-2xl border border-outline-variant/40 bg-surface-container",
    head: "border-b border-outline-variant/40 bg-surface-container-low",
    th: "text-on-surface-variant",
    row: "border-b border-outline-variant/40 hover:bg-surface-container-high/70",
    td: "text-on-surface",
    mobileCard: "border-outline-variant/40 bg-surface-container"
  },
  dark: {
    wrapper: "rounded-xl border border-outline-variant bg-surface-container",
    head: "border-b border-outline-variant/30 bg-surface-container-high/50",
    th: "text-on-surface-variant",
    row: "border-b border-outline-variant/20 hover:bg-surface-container-high/40",
    td: "text-on-surface",
    mobileCard: "border-outline-variant/30 bg-surface-container"
  }
};

function MobileDataCards({ columns, data, styles, getRowClassName }) {
  const dataColumns = columns.filter((col) => col.key !== "actions" && !col.mobileHidden);
  const actionsColumn = columns.find((col) => col.key === "actions");

  return (
    <div className="space-y-3 md:hidden">
      {data.map((row) => (
        <article
          key={row.id || row._key}
          className={cn(
            "rounded-2xl border p-4 shadow-sm",
            styles.mobileCard,
            getRowClassName?.(row)
          )}
        >
          <dl className="space-y-3">
            {dataColumns.map((col) => (
              <div key={col.key} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <dt className="text-xs font-bold text-on-surface-variant">{col.label}</dt>
                <dd className="min-w-0 text-sm font-medium text-on-surface sm:text-end">
                  {col.render ? col.render(row) : row[col.key]}
                </dd>
              </div>
            ))}
          </dl>
          {actionsColumn ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/30 pt-4">
              {actionsColumn.render(row)}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage,
  emptyDescription,
  getRowClassName,
  variant = "dark",
  mobileCards = true
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
    <>
      {mobileCards ? (
        <MobileDataCards
          columns={columns}
          data={data}
          styles={styles}
          getRowClassName={getRowClassName}
        />
      ) : null}

      <div className={cn(mobileCards ? "hidden md:block" : "block", "overflow-x-auto", styles.wrapper)}>
        <table className="w-full min-w-[720px] text-sm lg:min-w-[900px]">
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
                      col.key === "actions" && "min-w-[220px] whitespace-nowrap lg:min-w-[300px]"
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
    </>
  );
}
