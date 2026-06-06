"use client";

import { cn } from "@/lib/utils";

function scorePassword(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) || /[أ-ي]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "ضعيفة", color: "bg-danger", text: "text-danger" },
  { label: "مقبولة", color: "bg-warning", text: "text-warning" },
  { label: "جيدة", color: "bg-md-primary", text: "text-md-primary" },
  { label: "قوية", color: "bg-success", text: "text-success" }
];

export default function PasswordStrength({ password, className }) {
  const score = scorePassword(password);
  if (!password) return null;

  const level = score <= 1 ? LEVELS[0] : score === 2 ? LEVELS[1] : score === 3 ? LEVELS[2] : LEVELS[3];
  const bars = 4;

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? level.color : "bg-outline-variant/40"
            )}
          />
        ))}
      </div>
      <p className={cn("text-[11px] font-semibold", level.text)}>
        قوة كلمة المرور: {level.label}
      </p>
    </div>
  );
}

export { scorePassword };
