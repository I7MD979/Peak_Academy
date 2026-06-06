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

export const ROLE_SELECT_OPTIONS = REGISTER_ROLES.map(({ value, label }) => ({ value, label }));

/** Map landing ?level= prep|sec to default secondary grade. */
export function defaultGradeFromLevelParam(level) {
  const key = String(level || "").toLowerCase();
  if (key === "prep") return "first";
  if (key === "sec") return "third";
  return "third";
}

export const registerStep1Schema = z
  .object({
    email: z.string().trim().email("أدخل بريدًا إلكترونيًا صالحًا"),
    password: z
      .string()
      .min(8, "كلمة المرور 8 أحرف على الأقل")
      .max(72, "كلمة المرور طويلة جدًا"),
    confirmPassword: z.string().min(8, "أكّد كلمة المرور"),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "يجب الموافقة على الشروط وسياسة الخصوصية" })
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"]
  });

export const registerStep2Schema = z
  .object({
    full_name: z.string().trim().min(2, "الاسم الكامل مطلوب (حرفان على الأقل)"),
    role: z.enum(["student", "teacher", "parent"], { message: "اختر نوع الحساب" }),
    grade: z.enum(["first", "second", "third"]).optional(),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || String(val).trim().length >= 8, "رقم الهاتف غير صالح")
  })
  .superRefine((data, ctx) => {
    if (data.role === "student" && !data.grade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر الصف الدراسي",
        path: ["grade"]
      });
    }
  });
