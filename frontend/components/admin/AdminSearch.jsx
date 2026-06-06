"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { ADMIN_NAV_ACCOUNT, ADMIN_NAV_MAIN } from "@/lib/admin-nav";
import { adminInput } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const SEARCH_ITEMS = [...ADMIN_NAV_MAIN, ...ADMIN_NAV_ACCOUNT].map((item) => ({
  ...item,
  keywords: item.label
}));

export default function AdminSearch({ className }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS.slice(0, 6);
    return SEARCH_ITEMS.filter((item) => item.label.toLowerCase().includes(q) || item.href.includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navigate = (href) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      e.preventDefault();
      navigate(results[highlight].href);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative max-w-md flex-1", className)}>
      <Icon
        name="search"
        size={18}
        className="pointer-events-none absolute end-3 top-1/2 z-10 -translate-y-1/2 text-auth-on-surface-variant"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="بحث سريع في لوحة الإدارة..."
        className={cn(adminInput, "h-10 pe-10")}
        aria-label="بحث سريع"
        autoComplete="off"
      />

      {open && results.length > 0 ? (
        <ul
          id="admin-search-results"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-auth-outline-variant/40 bg-auth-surface-highest py-1 shadow-xl"
        >
          {results.map((item, index) => (
            <li key={item.href} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors",
                  index === highlight ? "bg-peak-orange/10 text-peak-orange" : "text-auth-on-surface hover:bg-auth-surface-low"
                )}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => navigate(item.href)}
              >
                <Icon name={item.icon} size={16} className="shrink-0 opacity-70" />
                <span className="font-bold">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
