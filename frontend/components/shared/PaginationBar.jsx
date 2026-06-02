"use client";

import { Button } from "@/components/ui/button";

export default function PaginationBar({ page, setPage, hasNext = true }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white p-3">
      <Button className="rounded-lg" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        السابق
      </Button>
      <span className="text-sm text-text-muted">الصفحة {page}</span>
      <Button className="rounded-lg" variant="outline" disabled={!hasNext} onClick={() => setPage(page + 1)}>
        التالي
      </Button>
    </div>
  );
}
