"use client";

import Icon from "@/components/shared/Icon";
import { parentBtnPrimary } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentReportActions({ onDownload, downloading = false, disabled = false }) {
  return (
    <section className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cn(parentBtnPrimary, "px-6")}
        disabled={downloading || disabled}
        onClick={onDownload}
      >
        <Icon name="download" size={18} />
        {downloading ? "جارٍ التنزيل…" : "تنزيل التقرير"}
      </button>
    </section>
  );
}
