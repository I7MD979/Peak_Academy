import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";

import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, loading, emptyMessage, emptyDescription, getRowClassName }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-2">
        <EmptyState title={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-bg">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-right font-semibold text-text-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id || row._key}
              className={cn(
                "border-b border-border transition-colors last:border-0 hover:bg-bg/70",
                getRowClassName?.(row)
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-text">
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
