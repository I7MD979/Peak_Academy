"use client";

import LiveSessionsBanner from "@/components/shared/LiveSessionsBanner";

export default function StudentSessionsLiveBanner({ count = 0, onViewLive }) {
  return <LiveSessionsBanner count={count} variant="student" onViewLive={onViewLive} />;
}
