"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { accountApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ButtonLoader } from "@/components/shared/LoadingSkeleton";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const DOC_LABELS = {
  student_id: "بطاقة الطالب",
  national_id: "الرقم القومي",
  syndicate_card: "كرت النقابة"
};

export default function VerificationUpload({
  docType,
  userId,
  required = false,
  onSubmitted,
  className
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;

    if (file.size > MAX_BYTES) {
      toast.error("حجم الملف أكبر من 10 ميجا");
      return;
    }
    if (!ALLOWED.has(file.type)) {
      toast.error("نوع الملف غير مدعوم — استخدم PDF أو صورة");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${userId}/${docType}-${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("verification-docs")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      await accountApi.submitVerificationDoc({ doc_type: docType, file_path: filePath });
      setDone(true);
      toast.success("تم الرفع — قيد المراجعة");
      onSubmitted?.();
    } catch (err) {
      toast.error(err.message || "تعذر رفع المستند");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-auth-outline-variant/30 bg-auth-surface-variant/10 p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-auth-on-surface">
            {DOC_LABELS[docType] || docType}
            {required ? <span className="text-danger"> *</span> : null}
          </p>
          <p className="mt-1 text-xs text-auth-on-surface-variant">
            PDF أو صورة (JPEG/PNG/WebP) — حتى 10 ميجا
          </p>
          {done ? (
            <p className="mt-2 text-xs font-bold text-success">تم الرفع — قيد المراجعة</p>
          ) : null}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || done}
            className="inline-flex items-center gap-2 rounded-xl border border-auth-primary/40 bg-auth-primary/10 px-4 py-2 text-sm font-bold text-auth-primary transition-colors hover:bg-auth-primary/20 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <ButtonLoader />
                جاري الرفع…
              </>
            ) : done ? (
              "تم الرفع"
            ) : (
              "رفع ملف"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
