"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/shared/Icon";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSecuritySection({ disabled = false }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "تعذر تحديث كلمة المرور");
    } finally {
      setSaving(false);
    }
  };

  const busy = disabled || saving;

  return (
    <section className="glass-card space-y-4 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="shield" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-text">الأمان وكلمة المرور</h2>
          <p className="mt-1 text-sm text-text-muted">حدّث كلمة مرور تسجيل الدخول لحسابك.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new_password">كلمة المرور الجديدة</Label>
          <Input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={busy}
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">تأكيد كلمة المرور</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={busy}
            minLength={6}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="outline" className="rounded-xl" disabled={busy}>
            {saving ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
          </Button>
        </div>
      </form>
    </section>
  );
}
