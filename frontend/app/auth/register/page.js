"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const schema = z
  .object({
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"]
  });

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess("");
    const { error: signUpError } = await signUpWithEmail(values.email, values.password);
    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
      setLoading(false);
      return;
    }
    setSuccess("تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.");
    setLoading(false);
    router.push("/auth/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">إنشاء حساب جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {success && <p className="text-sm text-success">{success}</p>}
            <Button disabled={loading} type="submit" className="h-11 w-full rounded-lg bg-accent text-white hover:bg-orange-500">
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-text-muted">
            لديك حساب بالفعل؟{" "}
            <Link className="text-accent hover:underline" href="/auth/login">
              سجل الدخول
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
