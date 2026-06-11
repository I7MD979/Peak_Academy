"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    trigger:
      "border-border bg-bg text-text hover:border-accent/50 focus:ring-primary focus:border-transparent",
    triggerOpen: "border-accent ring-2 ring-accent/20",
    label: "text-text-muted",
    popover: "border-border bg-card shadow-lg",
    header: "text-text bg-accent/5",
    columnTitle: "text-text-muted",
    cell: "text-text hover:bg-accent/10",
    cellSelected: "bg-accent text-white hover:bg-accent",
    footerBtn: "text-text-muted hover:bg-accent/10 hover:text-text",
    placeholder: "text-text-muted"
  },
  dark: {
    trigger:
      "border-outline-variant bg-surface-container-highest text-on-surface hover:border-primary-container/50 focus:ring-primary-container focus:border-primary-container",
    triggerOpen: "border-primary-container ring-1 ring-primary-container",
    label: "text-on-surface-variant",
    popover: "border-outline-variant bg-surface-container-high shadow-xl shadow-black/30",
    header: "text-on-surface bg-surface-container-highest/80",
    columnTitle: "text-on-surface-variant",
    cell: "text-on-surface hover:bg-surface-container-highest",
    cellSelected: "bg-primary-container text-on-primary-container hover:bg-primary-container",
    footerBtn: "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface",
    placeholder: "text-on-surface-variant/50"
  }
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parseTime(value) {
  if (!value) return { hour: null, minute: null };
  const [h, m] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour: null, minute: null };
  return { hour: h, minute: m };
}

function formatTimeValue(hour, minute) {
  if (hour == null || minute == null) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeDisplay(value) {
  const { hour, minute } = parseTime(value);
  if (hour == null || minute == null) return "";
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatUnit(n) {
  return String(n).padStart(2, "0").replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

function ScrollColumn({ items, selected, onSelect, styles, label, listRef }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className={cn("mb-2 text-center text-[10px] font-bold uppercase tracking-wide", styles.columnTitle)}>
        {label}
      </p>
      <div
        ref={listRef}
        className="max-h-44 overflow-y-auto overscroll-contain rounded-lg scroll-smooth [scrollbar-width:thin]"
      >
        <div className="flex flex-col gap-0.5 p-1">
          {items.map((item) => {
            const active = selected === item;
            return (
              <button
                key={item}
                type="button"
                data-value={item}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors",
                  styles.cell,
                  active && styles.cellSelected
                )}
              >
                {formatUnit(item)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CustomTimePicker = forwardRef(
  (
    {
      className,
      label,
      error,
      placeholder = "اختر الوقت",
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      disabled,
      id: idProp,
      variant = "light"
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp || autoId;
    const resolvedVariant = variant === "admin" ? "dark" : variant;
    const styles = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.light;

    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const containerRef = useRef(null);
    const hiddenInputRef = useRef(null);
    const hourListRef = useRef(null);
    const minuteListRef = useRef(null);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const { hour: selectedHour, minute: selectedMinute } = parseTime(currentValue);

    const [pendingHour, setPendingHour] = useState(selectedHour ?? 12);
    const [pendingMinute, setPendingMinute] = useState(selectedMinute ?? 0);

    useEffect(() => {
      if (typeof ref === "function") {
        ref(hiddenInputRef.current);
      } else if (ref) {
        ref.current = hiddenInputRef.current;
      }
    }, [ref]);

    useEffect(() => {
      if (!open) return;
      const parsed = parseTime(currentValue);
      setPendingHour(parsed.hour ?? 12);
      setPendingMinute(parsed.minute ?? 0);
    }, [open, currentValue]);

    useEffect(() => {
      if (!open) return;
      const scrollToSelected = (listRef, value) => {
        const el = listRef.current?.querySelector(`[data-value="${value}"]`);
        el?.scrollIntoView({ block: "center" });
      };
      requestAnimationFrame(() => {
        scrollToSelected(hourListRef, pendingHour);
        scrollToSelected(minuteListRef, pendingMinute);
      });
    }, [open, pendingHour, pendingMinute]);

    const emitChange = (nextValue) => {
      if (!isControlled) setInternalValue(nextValue);
      onChange?.({
        target: { name, value: nextValue },
        currentTarget: { name, value: nextValue }
      });
    };

    const applyTime = (hour, minute) => {
      const next = formatTimeValue(hour, minute);
      emitChange(next);
    };

    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
          onBlur?.({ target: { name, value: currentValue } });
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, currentValue, name, onBlur]);

    const selectHour = (hour) => {
      setPendingHour(hour);
      applyTime(hour, pendingMinute);
    };

    const selectMinute = (minute) => {
      setPendingMinute(minute);
      applyTime(pendingHour, minute);
      setOpen(false);
      onBlur?.({ target: { name, value: formatTimeValue(pendingHour, minute) } });
    };

    const setNow = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      setPendingHour(hour);
      setPendingMinute(minute);
      const next = formatTimeValue(hour, minute);
      emitChange(next);
      setOpen(false);
      onBlur?.({ target: { name, value: next } });
    };

    const displayValue = formatTimeDisplay(currentValue);
    const previewValue = formatTimeDisplay(formatTimeValue(pendingHour, pendingMinute));

    return (
      <div className={cn("relative flex flex-col gap-1.5", className)} ref={containerRef}>
        {label ? (
          <label htmlFor={id} className={cn("text-sm font-medium", styles.label)}>
            {label}
          </label>
        ) : null}

        <input type="hidden" ref={hiddenInputRef} name={name} value={currentValue ?? ""} readOnly />

        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
            "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            styles.trigger,
            open && styles.triggerOpen,
            error && "border-danger focus:ring-danger"
          )}
        >
          <span className={cn("truncate text-start font-semibold tabular-nums", !displayValue && styles.placeholder)}>
            {displayValue || placeholder}
          </span>
          <Clock className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </button>

        {open ? (
          <div
            className={cn("absolute z-50 mt-1 w-full min-w-[260px] overflow-hidden rounded-xl border", styles.popover)}
            style={{ top: "100%", left: 0 }}
          >
            <div className={cn("border-b px-4 py-3 text-center", styles.header)}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">الوقت المحدد</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums tracking-wide">{previewValue}</p>
            </div>

            <div className="flex gap-2 p-3">
              <ScrollColumn
                label="الساعة"
                items={HOURS}
                selected={pendingHour}
                onSelect={selectHour}
                styles={styles}
                listRef={hourListRef}
              />
              <div className="w-px self-stretch bg-black/10 dark:bg-white/10" aria-hidden />
              <ScrollColumn
                label="الدقيقة"
                items={MINUTES}
                selected={pendingMinute}
                onSelect={selectMinute}
                styles={styles}
                listRef={minuteListRef}
              />
            </div>

            <div className="border-t border-black/5 p-2 dark:border-white/10">
              <button
                type="button"
                onClick={setNow}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                  styles.footerBtn
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                الوقت الحالي
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
);
CustomTimePicker.displayName = "CustomTimePicker";

export { CustomTimePicker, VARIANT_STYLES as timePickerVariantStyles };
