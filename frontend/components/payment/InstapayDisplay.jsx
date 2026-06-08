"use client";

import { useState } from "react";
import { paymentsApi } from "@/lib/api";

export default function InstapayDisplay({ referenceCode, ipaAlias, amountEGP, paymentId }) {
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!receiptFile) return;
    setUploading(true);
    setError("");
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            resolve(result.split(",")[1] || "");
          } else {
            reject(new Error("فشل قراءة الملف"));
          }
        };
        reader.onerror = () => reject(new Error("فشل قراءة الملف"));
        reader.readAsDataURL(receiptFile);
      });

      await paymentsApi.uploadInstapayReceipt({
        paymentId,
        referenceCode,
        image_base64: base64,
        content_type: receiptFile.type || "image/jpeg"
      });
      setUploaded(true);
    } catch (err) {
      setError(err.message || "فشل رفع الإيصال");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6" dir="rtl">
      <p className="mb-4 text-center text-xl font-bold text-blue-700">تحويل إنستاباي</p>
      <div className="space-y-3 rounded-xl bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">IPA Alias:</span>
          <strong className="font-mono text-blue-600">{ipaAlias}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">المبلغ:</span>
          <strong>{amountEGP} جنيه</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">البيان (مهم!):</span>
          <strong className="font-mono text-orange-600">{referenceCode}</strong>
        </div>
      </div>

      <div className="mt-4 space-y-1 rounded-lg bg-blue-100 p-3 text-sm text-blue-800">
        <p>افتح تطبيق البنك أو تطبيق إنستاباي</p>
        <p>حول المبلغ إلى {ipaAlias}</p>
        <p>
          اكتب في البيان: <strong>{referenceCode}</strong>
        </p>
        <p>ارفع صورة الإيصال أدناه</p>
      </div>

      {!uploaded ? (
        <div className="mt-4 space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500"
          />
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!receiptFile || uploading}
            className="w-full rounded-lg bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {uploading ? "جارٍ الرفع…" : "رفع الإيصال"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center font-semibold text-green-600">
          تم رفع الإيصال، سيتم التحقق خلال ساعات قليلة
        </p>
      )}
    </div>
  );
}
