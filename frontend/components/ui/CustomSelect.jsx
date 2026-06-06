"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  light: {
    trigger:
      "border-border bg-bg text-text hover:border-accent/50 focus:ring-primary focus:border-transparent",
    triggerOpen: "border-accent ring-2 ring-accent/20",
    label: "text-text-muted",
    menu: "border-border bg-card shadow-lg",
    option: "text-text hover:bg-accent/10",
    optionSelected: "bg-accent/10 text-accent font-semibold",
    chevron: "text-text-muted",
    placeholder: "text-text-muted"
  },
  dark: {
    trigger:
      "border-outline-variant bg-surface-container-highest text-on-surface hover:border-primary-container/50 focus:ring-primary-container focus:border-primary-container",
    triggerOpen: "border-primary-container ring-1 ring-primary-container",
    label: "text-on-surface-variant",
    menu: "border-outline-variant bg-surface-container-high shadow-xl shadow-black/30",
    option: "text-on-surface hover:bg-surface-container-highest",
    optionSelected: "bg-primary-container/15 text-md-primary font-semibold",
    chevron: "text-on-surface-variant",
    placeholder: "text-on-surface-variant/50"
  }
};

function optionsFromChildren(children) {
  const items = [];
  if (!children) return items;
  const arr = Array.isArray(children) ? children : [children];
  for (const child of arr) {
    if (child?.type === "option" || child?.props?.value != null) {
      items.push({
        value: String(child.props.value ?? ""),
        label: child.props.children ?? child.props.value ?? "",
        disabled: Boolean(child.props.disabled)
      });
    }
  }
  return items;
}

const CustomSelect = forwardRef(
  (
    {
      className,
      label,
      error,
      placeholder = "اختر...",
      options: optionsProp,
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      disabled,
      id: idProp,
      variant = "light",
      showError = true,
      "aria-label": ariaLabel
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp || autoId;
    const listboxId = `${id}-listbox`;
    const resolvedVariant = variant === "admin" ? "dark" : variant;
    const styles = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.light;

    const options = optionsProp?.length ? optionsProp : optionsFromChildren(children);

    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const [highlightIndex, setHighlightIndex] = useState(-1);

    const containerRef = useRef(null);
    const hiddenInputRef = useRef(null);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const selectedOption = options.find((o) => o.value === currentValue);

    useEffect(() => {
      if (typeof ref === "function") {
        ref(hiddenInputRef.current);
      } else if (ref) {
        ref.current = hiddenInputRef.current;
      }
    }, [ref]);

    const emitChange = useCallback(
      (nextValue) => {
        if (!isControlled) setInternalValue(nextValue);
        onChange?.({
          target: { name, value: nextValue },
          currentTarget: { name, value: nextValue }
        });
      },
      [isControlled, name, onChange]
    );

    const selectOption = useCallback(
      (opt) => {
        if (opt.disabled) return;
        emitChange(opt.value);
        setOpen(false);
        onBlur?.({ target: { name, value: opt.value } });
      },
      [emitChange, name, onBlur]
    );

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
      if (open) {
        const idx = options.findIndex((o) => o.value === currentValue);
        setHighlightIndex(idx >= 0 ? idx : 0);
      }
    }, [open, options, currentValue]);

    const handleKeyDown = (e) => {
      if (disabled) return;

      if (!open) {
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => {
          let next = i + 1;
          while (next < options.length && options[next]?.disabled) next += 1;
          return next < options.length ? next : i;
        });
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          let next = i - 1;
          while (next >= 0 && options[next]?.disabled) next -= 1;
          return next >= 0 ? next : i;
        });
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const opt = options[highlightIndex];
        if (opt && !opt.disabled) selectOption(opt);
      }
    };

    return (
      <div className={cn("flex flex-col gap-1.5", className)} ref={containerRef}>
        {label ? (
          <label htmlFor={id} className={cn("text-sm font-medium", styles.label)}>
            {label}
          </label>
        ) : null}

        <input type="hidden" ref={hiddenInputRef} name={name} value={currentValue ?? ""} readOnly />

        <div className="relative">
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel || label || placeholder}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
            "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            styles.trigger,
            open && styles.triggerOpen,
            error && "border-danger focus:ring-danger"
          )}
        >
          <span className={cn("truncate text-start", !selectedOption && styles.placeholder)}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", styles.chevron, open && "rotate-180")}
            aria-hidden
          />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            className={cn(
              "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border py-1",
              styles.menu
            )}
          >
            {options.map((opt, idx) => {
              const selected = opt.value === currentValue;
              const highlighted = idx === highlightIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={opt.disabled}
                  onMouseEnter={() => !opt.disabled && setHighlightIndex(idx)}
                  onClick={() => selectOption(opt)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors",
                    styles.option,
                    selected && styles.optionSelected,
                    highlighted && !selected && "bg-accent/5",
                    opt.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span>{opt.label}</span>
                  {selected ? (
                    <Check className={cn("h-4 w-4 shrink-0", resolvedVariant === "dark" ? "text-md-primary" : "text-accent")} aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        </div>

        {error && showError ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
);
CustomSelect.displayName = "CustomSelect";

export { CustomSelect, VARIANT_STYLES as selectVariantStyles };
