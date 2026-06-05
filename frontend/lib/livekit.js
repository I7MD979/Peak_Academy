"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";

export default function LiveRoom({ roomUrl, token, isTeacher: _isTeacher }) {
  if (!roomUrl || !token) {
    return (
      <main className="flex h-screen items-center justify-center bg-bg p-4">
        <SectionLoader message="جاري تحميل غرفة البث..." />
      </main>
    );
  }

  return (
    <main className="h-screen bg-black">
      <LiveKitRoom serverUrl={roomUrl} token={token} connect video audio style={{ height: "100%" }}>
        <VideoConference />
      </LiveKitRoom>
    </main>
  );
}
