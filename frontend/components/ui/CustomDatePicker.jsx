"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    trigger:
      "border-outline-variant/40 bg-surface-container-low text-on-surface hover:border-accent/50 hover:bg-surface-container-high focus:ring-primary focus:border-transparent",
    triggerOpen: "border-accent ring-2 ring-accent/20",
    label: "text-on-surface-variant",
    popover: "border-outline-variant/40 bg-surface-container shadow-lg",
    day: "text-on-surface hover:bg-surface-container-high",
    daySelected: "bg-accent text-white hover:bg-accent",
    dayToday: "ring-1 ring-accent/40",
    dayOutside: "text-on-surface-variant/40",
    header: "text-on-surface",
    nav: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
    placeholder: "text-on-surface-variant"
  },
  dark: {
    trigger:
      "border-outline-variant bg-surface-container-highest text-on-surface hover:border-primary-container/50 focus:ring-primary-container focus:border-primary-container",
    triggerOpen: "border-primary-container ring-1 ring-primary-container",
    label: "text-on-surface-variant",
    popover: "border-outline-variant bg-surface-container-high shadow-xl shadow-black/30",
    day: "text-on-surface hover:bg-surface-container-highest",
    daySelected: "bg-primary-container text-on-primary-container hover:bg-primary-container",
    dayToday: "ring-1 ring-primary-container/50",
    dayOutside: "text-on-surface-variant/30",
    header: "text-on-surface",
    nav: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest",
    placeholder: "text-on-surface-variant/50"
  }
};

const WEEKDAYS_AR = ["أ", "إ", "ث", "أ", "خ", "ج", "س"];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  if (!date) return "";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days = [];

  for (let i = startPad - 1; i >= 0; i -= 1) {
    const d = new Date(year, month, -i);
    days.push({ date: d, outside: true });
  }

  for (let d = 1; d <= last.getDate(); d += 1) {
    days.push({ date: new Date(year, month, d), outside: false });
  }

  while (days.length % 7 !== 0) {
    const next = days.length - startPad - last.getDate() + 1;
    days.push({ date: new Date(year, month + 1, next), outside: true });
  }

  return days;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const CustomDatePicker = forwardRef(
  (
    {
      className,
      label,
      error,
      placeholder = "اختر التاريخ",
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      disabled,
      id: idProp,
      variant = "light",
      min,
      max
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

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const selectedDate = parseDate(currentValue);
    const today = new Date();

    const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

    useEffect(() => {
      if (typeof ref === "function") {
        ref(hiddenInputRef.current);
      } else if (ref) {
        ref.current = hiddenInputRef.current;
      }
    }, [ref]);

    const emitChange = (nextValue) => {
      if (!isControlled) setInternalValue(nextValue);
      onChange?.({
        target: { name, value: nextValue },
        currentTarget: { name, value: nextValue }
      });
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

    useEffect(() => {
      if (selectedDate) {
        setViewYear(selectedDate.getFullYear());
        setViewMonth(selectedDate.getMonth());
      }
    }, [selectedDate]);

    const minDate = parseDate(min);
    const maxDate = parseDate(max);

    const isDisabledDay = (date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    const selectDay = (date) => {
      if (isDisabledDay(date)) return;
      const formatted = formatDate(date);
      emitChange(formatted);
      setOpen(false);
      onBlur?.({ target: { name, value: formatted } });
    };

    const prevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    };

    const nextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    };

    const days = getCalendarDays(viewYear, viewMonth);

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
          <span className={cn("truncate text-start", !selectedDate && styles.placeholder)}>
            {selectedDate ? formatDisplay(selectedDate) : placeholder}
          </span>
          <Calendar className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </button>

        {open ? (
          <div
            className={cn("absolute z-50 mt-1 w-full min-w-[280px] rounded-xl border p-3", styles.popover)}
            style={{ top: "100%", left: 0 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className={cn("rounded-lg p-1.5 transition-colors", styles.nav)}
                aria-label="الشهر السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className={cn("text-sm font-bold", styles.header)}>
                {MONTHS_AR[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className={cn("rounded-lg p-1.5 transition-colors", styles.nav)}
                aria-label="الشهر التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS_AR.map((day) => (
                <div key={day} className="py-1 text-center text-[10px] font-bold opacity-50">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map(({ date, outside }, idx) => {
                const selected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const dayDisabled = isDisabledDay(date);
                return (
                  <button
                    key={`${date.toISOString()}-${idx}`}
                    type="button"
                    disabled={dayDisabled}
                    onClick={() => selectDay(date)}
                    className={cn(
                      "flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors",
                      styles.day,
                      outside && styles.dayOutside,
                      selected && styles.daySelected,
                      isToday && !selected && styles.dayToday,
                      dayDisabled && "cursor-not-allowed opacity-30"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
);
CustomDatePicker.displayName = "CustomDatePicker";

export { CustomDatePicker, VARIANT_STYLES as datePickerVariantStyles };
