"use client";

import { forwardRef, useId, useRef, useState, useEffect } from "react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { CustomTimePicker } from "@/components/ui/CustomTimePicker";
import { cn } from "@/lib/utils";

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
      <div className={cn("flex flex-col gap-1.5", error && "[&_button]:border-danger", className)}>
        {label ? (
          <span className={cn(
            "text-sm font-medium",
            resolvedVariant === "dark" ? "text-on-surface-variant" : "text-text-muted"
          )}>
            {label}
          </span>
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
          <CustomTimePicker
            variant={resolvedVariant}
            value={time}
            onChange={(e) => emit(joinDateTime(date, e.target.value))}
            onBlur={onBlur}
            className="flex-1"
            placeholder="اختر الوقت"
          />
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

const TimePicker = forwardRef(({ variant = "light", ...props }, ref) => {
  return <CustomTimePicker ref={ref} variant={variant} {...props} />;
});
TimePicker.displayName = "TimePicker";

export { DateTimePicker, DatePicker, TimePicker, CustomDatePicker, CustomTimePicker };
