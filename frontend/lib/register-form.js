import { z } from "zod";

export const REGISTER_ROLES = [
  {
    value: "student",
    label: "طالب",
    description: "حضور جلسات لايف ومتابعة التقدّم",
    icon: "graduation"
  },
  {
    value: "teacher",
    label: "معلّم",
    description: "إنشاء جلسات وإدارة الطلاب",
    icon: "book"
  },
  {
    value: "parent",
    label: "وليّ أمر",
    description: "متابعة الحضور والتقارير",
    icon: "users"
  }
];

export const registerStep1Schema = z
  .object({
    email: z.string().email("أدخل بريدًا إلكترونيًا صالحًا"),
    password: z
      .string()
      .min(6, "كلمة المرور 6 أحرف على الأقل")
      .max(72, "كلمة المرور طويلة جدًا"),
    confirmPassword: z.string().min(6, "أكّد كلمة المرور")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"]
  });

export const registerStep2Schema = z.object({
  full_name: z.string().trim().min(2, "الاسم الكامل مطلوب (حرفان على الأقل)"),
  role: z.enum(["student", "teacher", "parent"]),
  grade: z.enum(["first", "second", "third"]).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || String(val).trim().length >= 8, "رقم الهاتف غير صالح")
});
