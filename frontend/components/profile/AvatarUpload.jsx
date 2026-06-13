"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function resizeImage(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("تعذر معالجة الصورة"));
            return;
          }
          resolve(blob);
        },
        type,
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة الصورة"));
    };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function AvatarUpload({ name, avatarUrl, onUploaded, disabled = false, className }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const displayUrl = preview || avatarUrl;

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("استخدم صورة بصيغة JPEG أو PNG أو WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("حجم الصورة يجب ألا يتجاوز 2 ميجابايت");
      return;
    }

    try {
      setUploading(true);
      const blob = await resizeImage(file);
      if (blob.size > MAX_BYTES) {
        toast.error("الصورة كبيرة جدًا بعد المعالجة");
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      setPreview(objectUrl);
      const image_base64 = await blobToBase64(blob);
      const res = await authApi.uploadAvatar({
        image_base64,
        content_type: blob.type
      });
      const url = res?.data?.avatar_url;
      if (url) {
        onUploaded?.(url);
        toast.success("تم تحديث الصورة الشخصية");
      }
    } catch (err) {
      setPreview(null);
      toast.error(err.message || "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative">
        <ProfileAvatar name={name} avatarUrl={displayUrl} size="xl" />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 left-0 rounded-full border border-outline-variant/40 bg-surface-container px-2 py-1 text-xs font-bold text-on-surface shadow-sm hover:bg-muted disabled:opacity-50"
        >
          {uploading ? "جارٍ..." : "تعديل"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
      <p className="text-center text-xs text-on-surface-variant">JPEG أو PNG أو WebP — حتى 2 ميجابايت</p>
    </div>
  );
}
