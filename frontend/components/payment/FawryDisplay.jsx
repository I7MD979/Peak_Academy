"use client";

import { useEffect, useState } from "react";
import { statusWarning, lightPanel, lightPanelMuted } from "@/lib/semantic-styles";
import { cn } from "@/lib/utils";

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
    <div className={cn("rounded-2xl border-2 border-dashed p-6 text-center", statusWarning)} dir="rtl">
      <p className={cn("mb-2", lightPanelMuted)}>رقم الاستعلام فوري</p>
      <p className="font-mono text-4xl font-bold tracking-widest text-peak-orange">{referenceCode}</p>
      <p className="mt-4 text-auth-on-surface">
        المبلغ: <strong>{amountEgp} جنيه</strong>
      </p>
      {timeLeft ? <p className={cn("mt-2 text-sm", lightPanelMuted)}>ينتهي بعد: {timeLeft}</p> : null}
      <div className={cn("mt-4 space-y-1 rounded-lg p-3 text-right text-sm", lightPanel)}>
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
