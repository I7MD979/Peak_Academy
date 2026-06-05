"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

export default function LiveRoom({ roomUrl, token, isTeacher: _isTeacher }) {
  if (!roomUrl || !token) {
    return (
      <main className="flex h-screen items-center justify-center bg-bg p-4">
        <p className="text-sm text-text-muted">جاري تحميل غرفة البث...</p>
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
