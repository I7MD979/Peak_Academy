"use client";

import { useEffect, useState } from "react";

export default function FawryDisplay({ referenceCode, expiresAt, amount }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("انتهت المهلة");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${d} يوم ${h} ساعة ${m} دقيقة`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const amountEgp = typeof amount === "number" ? (amount / 100).toFixed(2) : amount;

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-6 text-center"
      dir="rtl"
    >
      <p className="mb-2 text-gray-600">رقم الاستعلام فوري</p>
      <p className="font-mono text-4xl font-bold tracking-widest text-orange-600">{referenceCode}</p>
      <p className="mt-4 text-gray-700">
        المبلغ: <strong>{amountEgp} جنيه</strong>
      </p>
      {timeLeft ? <p className="mt-2 text-sm text-gray-500">ينتهي بعد: {timeLeft}</p> : null}
      <div className="mt-4 space-y-1 rounded-lg bg-white p-3 text-right text-sm text-gray-600">
        <p>1. افتح تطبيق فوري أو اتجه لأي منفذ فوري</p>
        <p>2. اختر &quot;دفع الفواتير&quot;</p>
        <p>
          3. أدخل رقم الاستعلام: <strong>{referenceCode}</strong>
        </p>
        <p>4. ادفع المبلغ واحتفظ بالإيصال</p>
      </div>
    </div>
  );
}
