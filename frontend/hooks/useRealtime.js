"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export const useRealtime = ({ table, onChange }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!table || typeof onChange !== "function") return undefined;

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        onChangeRef.current?.(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
};
