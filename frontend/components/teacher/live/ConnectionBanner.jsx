"use client";

export default function ConnectionBanner({ visible }) {
  if (!visible) return null;
  return (
    <div className="bg-danger px-4 py-2 text-center text-sm font-bold text-white">
      ⚠️ انقطع الاتصال — جاري إعادة الاتصال...
    </div>
  );
}
