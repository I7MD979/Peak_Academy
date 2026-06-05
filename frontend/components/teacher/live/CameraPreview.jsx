"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CameraPreview() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [videoDeviceId, setVideoDeviceId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const start = async (deviceId) => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOk(stream.getVideoTracks().some((t) => t.readyState === "live"));
        setMicOk(stream.getAudioTracks().some((t) => t.readyState === "live"));
        setError("");
      } catch (err) {
        setCameraOk(false);
        setMicOk(false);
        setError(err?.message || "تعذر الوصول للكاميرا أو الميكروفون");
      }
    };

    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter((d) => d.kind === "videoinput");
        if (!cancelled) setDevices(cams);
        await start(videoDeviceId || cams[0]?.deviceId);
      } catch (err) {
        if (!cancelled) setError(err?.message || "المتصفح لا يدعم الكاميرا");
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoDeviceId]);

  return (
    <Card className="rounded-xl border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-primary">فحص الكاميرا</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-[135px] w-full max-w-[240px] object-cover"
          />
        </div>
        {devices.length > 1 ? (
          <select
            className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs"
            value={videoDeviceId}
            onChange={(e) => setVideoDeviceId(e.target.value)}
          >
            <option value="">الكاميرا الافتراضية</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "كاميرا"}
              </option>
            ))}
          </select>
        ) : null}
        <div className="space-y-1 text-sm">
          <p className={cameraOk ? "text-success" : "text-danger"}>
            {cameraOk ? "✓ كاميرا شغالة" : "✗ الكاميرا غير متاحة"}
          </p>
          <p className={micOk ? "text-success" : "text-danger"}>
            {micOk ? "✓ ميكروفون شغال" : "✗ الميكروفون غير متاح"}
          </p>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
