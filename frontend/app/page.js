import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { value: "3 مليون+", label: "طالب على مستوى الجمهورية" },
  { value: "500+", label: "مدرس متميز" },
  { value: "1200+", label: "جلسة يومياً" }
];

export default function LandingPage() {
  return (
    <main className="bg-bg">
      <section className="bg-primary px-4 py-16 text-center text-white md:px-6">
        <h1 className="text-3xl font-black md:text-5xl">وصّل للقمة مع Peak Academy</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 md:text-base">
          منصة تعليمية مصرية لطلاب الثانوية العامة بجلسات لايف، متابعة دقيقة، ومدرسين متميزين.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/auth/register">
            <Button className="rounded-lg bg-accent text-white hover:bg-orange-500">ابدأ مجاناً</Button>
          </Link>
          <Link href="/auth/login">
            <Button className="rounded-lg bg-white text-primary hover:bg-slate-100">تسجيل الدخول</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 px-4 py-10 md:grid-cols-3 md:px-6">
        {stats.map((item) => (
          <Card key={item.label} className="rounded-xl border-border">
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold text-primary">{item.value}</p>
              <p className="text-sm text-text-muted">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
