"use client";

import { forwardRef, useId, useRef, useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    time:
      "border-border bg-bg text-text focus:ring-primary focus:border-transparent placeholder:text-text-muted",
    timeLabel: "text-text-muted"
  },
  dark: {
    time:
      "border-outline-variant bg-surface-container-highest text-on-surface focus:ring-primary-container focus:border-primary-container placeholder:text-on-surface-variant/50",
    timeLabel: "text-on-surface-variant"
  }
};

function splitDateTime(value) {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date || "", time: time?.slice(0, 5) || "" };
}

function joinDateTime(date, time) {
  if (!date) return "";
  return time ? `${date}T${time}` : `${date}T00:00`;
}

const DateTimePicker = forwardRef(
  ({ className, label, error, value, defaultValue, onChange, onBlur, name, variant = "light", ...props }, ref) => {
    const autoId = useId();
    const hiddenRef = useRef(null);
    const resolvedVariant = variant === "admin" ? "dark" : variant;
    const styles = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.light;

    const isControlled = value !== undefined;
    const [internal, setInternal] = useState(defaultValue ?? "");
    const current = isControlled ? value : internal;
    const { date, time } = splitDateTime(current);

    useEffect(() => {
      if (typeof ref === "function") {
        ref(hiddenRef.current);
      } else if (ref) {
        ref.current = hiddenRef.current;
      }
    }, [ref]);

    const emit = (next) => {
      if (!isControlled) setInternal(next);
      onChange?.({ target: { name, value: next }, currentTarget: { name, value: next } });
    };

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label ? (
          <span className={cn("text-sm font-medium", styles.timeLabel)}>{label}</span>
        ) : null}
        <input type="hidden" ref={hiddenRef} name={name} value={current ?? ""} readOnly />
        <div className="flex flex-col gap-2 sm:flex-row">
          <CustomDatePicker
            variant={resolvedVariant}
            value={date}
            onChange={(e) => emit(joinDateTime(e.target.value, time))}
            onBlur={onBlur}
            className="flex-1"
            {...props}
          />
          <div className="relative flex-1">
            <input
              type="time"
              value={time}
              onChange={(e) => emit(joinDateTime(date, e.target.value))}
              onBlur={onBlur}
              className={cn(
                "flex h-11 w-full rounded-lg border px-3 py-2 pl-10 text-sm transition-all",
                "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                "[color-scheme:dark]",
                styles.time,
                error && "border-danger focus:ring-danger"
              )}
            />
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
          </div>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";

const DatePicker = forwardRef(({ variant = "light", ...props }, ref) => {
  return <CustomDatePicker ref={ref} variant={variant} {...props} />;
});
DatePicker.displayName = "DatePicker";

export { DateTimePicker, DatePicker, CustomDatePicker };
