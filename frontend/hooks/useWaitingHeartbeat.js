"use client";

import { useEffect } from "react";
import { sessionsApi } from "@/lib/api";

/** Student waiting room — pings backend every 15s so teacher sees "جاهز". */
export function useWaitingHeartbeat(sessionId, enabled = true) {
  useEffect(() => {
    if (!sessionId || !enabled) return undefined;

    const ping = () => {
      sessionsApi.waitingHeartbeat(sessionId).catch(() => {});
    };

    ping();
    const id = setInterval(ping, 15_000);
    return () => clearInterval(id);
  }, [sessionId, enabled]);
}
