import Link from "next/link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold text-primary">الصفحة غير موجودة</h2>
      <p className="text-sm text-text-muted">الرابط الذي فتحته غير صحيح أو تم نقل الصفحة.</p>
      <Link href="/">
        <Button className="rounded-lg bg-accent text-white hover:bg-orange-500">العودة للرئيسية</Button>
      </Link>
    </main>
  );
}
