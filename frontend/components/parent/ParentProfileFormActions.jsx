"use client";

import { parentBtnPrimary, parentBtnSecondary } from "@/lib/parent-styles";

export default function ParentProfileFormActions({ saving = false, onReset }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={saving} className={parentBtnPrimary}>
        {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
      </button>
      <button type="button" disabled={saving} onClick={onReset} className={parentBtnSecondary}>
        تراجع
      </button>
    </div>
  );
}
