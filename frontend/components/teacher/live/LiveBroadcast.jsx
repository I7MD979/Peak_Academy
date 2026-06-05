"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import ConnectionBanner from "./ConnectionBanner";
import LiveSessionHeader from "./LiveSessionHeader";
import DailyVideoRoom from "./DailyVideoRoom";
import TeacherToolsPanel from "./TeacherToolsPanel";
import AttendancePanel from "./AttendancePanel";
import EndSessionDialog from "./EndSessionDialog";

export default function LiveBroadcast({
  session,
  sessionId,
  roomUrl,
  token,
  startedAt,
  isOffline,
  ending,
  onEnd
}) {
  const [call, setCall] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [endOpen, setEndOpen] = useState(false);

  const handleCallReady = useCallback((instance) => {
    setCall(instance);
  }, []);

  const handleEndConfirm = async () => {
    try {
      await onEnd();
      setEndOpen(false);
    } catch (err) {
      toast.error(err?.message || "تعذر إنهاء الجلسة");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <ConnectionBanner visible={isOffline} />
      <LiveSessionHeader
        session={session}
        startedAt={startedAt}
        connectedCount={participants.length}
        onEndClick={() => setEndOpen(true)}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 flex-[3] p-3 md:p-4">
          <DailyVideoRoom
            roomUrl={roomUrl}
            token={token}
            onCallReady={handleCallReady}
            onParticipantsChange={setParticipants}
          />
        </div>
        <aside className="flex w-full flex-col border-t border-border bg-card lg:w-80 lg:border-r lg:border-t-0">
          <TeacherToolsPanel sessionId={sessionId} call={call} />
          <AttendancePanel
            participants={participants}
            maxStudents={session?.maxStudents || 5}
            call={call}
          />
        </aside>
      </div>
      <EndSessionDialog
        open={endOpen}
        connectedCount={participants.length}
        startedAt={startedAt}
        loading={ending}
        onClose={() => setEndOpen(false)}
        onConfirm={handleEndConfirm}
      />
    </div>
  );
}
