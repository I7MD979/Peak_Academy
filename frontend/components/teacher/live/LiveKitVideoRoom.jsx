"use client";

import { useEffect } from "react";
import { LiveKitRoom, VideoConference, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Skeleton } from "@/components/ui/skeleton";

function RoomBridge({ onCallReady, onParticipantsChange }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return undefined;

    onCallReady?.(room);

    const syncParticipants = () => {
      const list = Array.from(room.remoteParticipants.values()).map((p) => ({
        id: p.identity,
        participantKey: p.identity,
        name: p.name || p.identity,
        audio: p.isMicrophoneEnabled,
        video: p.isCameraEnabled
      }));
      onParticipantsChange?.(list);
    };

    room.on("participantConnected", syncParticipants);
    room.on("participantDisconnected", syncParticipants);
    room.on("trackMuted", syncParticipants);
    room.on("trackUnmuted", syncParticipants);
    room.on("localTrackPublished", syncParticipants);

    syncParticipants();

    return () => {
      room.off("participantConnected", syncParticipants);
      room.off("participantDisconnected", syncParticipants);
      room.off("trackMuted", syncParticipants);
      room.off("trackUnmuted", syncParticipants);
      room.off("localTrackPublished", syncParticipants);
      onCallReady?.(null);
    };
  }, [room, onCallReady, onParticipantsChange]);

  return null;
}

export default function LiveKitVideoRoom({ roomUrl, token, onCallReady, onParticipantsChange }) {
  if (!roomUrl || !token) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      className="lk-room-container relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-auth-outline-variant/40 bg-black"
      style={{ height: "100%", width: "100%", minHeight: "320px" }}
    >
      <LiveKitRoom
        serverUrl={roomUrl}
        token={token}
        connect={true}
        video={true}
        audio={true}
        data-lk-theme="default"
        style={{ height: "100%", width: "100%" }}
      >
        <VideoConference />
        <RoomBridge onCallReady={onCallReady} onParticipantsChange={onParticipantsChange} />
      </LiveKitRoom>
    </div>
  );
}
