"use client";

import { Button } from "../components/ui/button";

export default function GlobalError({ error, reset }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <h2 className="text-2xl font-bold text-primary">حدث خطأ غير متوقع</h2>
      <p className="text-sm text-text-muted">{error?.message || "حاول مرة أخرى أو حدّث الصفحة."}</p>
      <Button className="rounded-lg bg-accent text-white hover:bg-orange-500" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </main>
  );
}
