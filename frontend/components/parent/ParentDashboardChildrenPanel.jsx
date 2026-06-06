"use client";

import ParentChildCard from "@/components/parent/ParentChildCard";
import ProfileLinkStudentPanel from "@/components/profile/ProfileLinkStudentPanel";
import Icon from "@/components/shared/Icon";
import {
  parentBtnPrimary,
  parentCardSolid,
  parentMuted
} from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentDashboardChildrenPanel({
  linkedChildren = [],
  selectedId = "",
  onSelectChild,
  showLinkForm = false,
  onToggleLinkForm,
  linkCode = "",
  onLinkCodeChange,
  onLinkSubmit,
  linking = false
}) {
  return (
    <section className={cn(parentCardSolid, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="users" size={20} className="text-peak-orange" />
          <div>
            <h2 className="text-lg font-black text-auth-on-surface">الأبناء المربوطون</h2>
            <p className={cn("text-sm", parentMuted)}>
              {linkedChildren.length.toLocaleString("ar-EG")} طالب مربوط
            </p>
          </div>
        </div>
        <button type="button" onClick={onToggleLinkForm} className={cn(parentBtnPrimary, "px-4 py-2 text-sm")}>
          <Icon name="plus" size={16} />
          {showLinkForm ? "إخفاء" : "ربط طالب"}
        </button>
      </div>

      {showLinkForm ? (
        <div className="border-t border-auth-outline-variant/30 pt-4">
          <ProfileLinkStudentPanel
            embedded
            linkCode={linkCode}
            onLinkCodeChange={onLinkCodeChange}
            onLinkSubmit={onLinkSubmit}
            linking={linking}
            inputId="dashboard-link-code"
          />
        </div>
      ) : null}

      {linkedChildren.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {linkedChildren.map((child) => (
            <ParentChildCard
              key={child.id}
              child={child}
              active={selectedId === child.id}
              onClick={() => onSelectChild?.(child.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
