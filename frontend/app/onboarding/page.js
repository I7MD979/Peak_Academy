"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/Select";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { GRADE_OPTIONS } from "@/lib/profile-form";
import { isProfileComplete, resolvePostAuthPathClient, ROLE_HOME } from "@/lib/role-routes";

const schema = z.object({
  full_name: z.string().min(2, "الاسم مطلوب"),
  role: z.enum(["student", "teacher", "parent"]),
  grade: z.enum(["first", "second", "third"]).optional(),
  phone: z.string().optional()
});

export default function OnboardingPage() {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: "student", grade: "third" }
  });

  const selectedRole = watch("role");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const path = await resolvePostAuthPathClient(session?.access_token);
      if (!cancelled && path !== "/onboarding") {
        router.replace(path);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const onSubmit = async (values) => {
    setLoading(true);
    setError("");
    try {
      if (values.role === "student" && !values.grade) {
        throw new Error("اختر الصف الدراسي");
      }

      const res = await authApi.setupProfile({
        full_name: values.full_name,
        role: values.role,
        grade: values.role === "student" ? values.grade : undefined,
        phone: values.phone?.trim() || undefined
      });

      const createdUser = res?.data;
      let nextPath = "/onboarding";

      if (createdUser && isProfileComplete(createdUser)) {
        nextPath = ROLE_HOME[createdUser.role] || "/onboarding";
      } else {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        nextPath = await resolvePostAuthPathClient(session?.access_token);
      }

      if (nextPath === "/onboarding") {
        if (res?.success && ROLE_HOME[values.role]) {
          nextPath = ROLE_HOME[values.role];
        } else {
          throw new Error("تعذر إكمال الملف الشخصي. حدّث الصفحة أو تواصل مع الدعم.");
        }
      }

      toast.success(res?.message || "تم إنشاء ملفك الشخصي بنجاح");
      router.replace(nextPath);
    } catch (err) {
      const message = err.message || "حدث خطأ غير متوقع";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-lg rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">أكمل ملفك الشخصي</CardTitle>
          <p className="text-center text-sm text-text-muted">
            ننشئ حسابك في بيك أكاديمي حسب نوع المستخدم (طالب، مدرس، أو ولي أمر)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="full_name">الاسم بالكامل</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
            </div>

            <Select id="role" label="نوع الحساب" {...register("role")}>
              <option value="student">طالب</option>
              <option value="teacher">مدرس</option>
              <option value="parent">ولي أمر</option>
            </Select>

            {selectedRole === "student" ? (
              <Select
                id="grade"
                label="الصف الدراسي"
                error={errors.grade?.message}
                {...register("grade")}
              >
                {GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
              <Input id="phone" type="tel" dir="ltr" {...register("phone")} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              className="h-11 w-full rounded-lg bg-accent text-white hover:bg-orange-500"
              disabled={loading}
              type="submit"
            >
              {loading ? "جاري إنشاء الملف..." : "حفظ والمتابعة"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
