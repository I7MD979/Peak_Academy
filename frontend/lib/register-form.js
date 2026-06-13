import { z } from "zod";
import {
  defaultGradeFromLevelParam,
  defaultSchoolLevelFromLevelParam,
  isGradeValidForSchoolLevel,
  STUDENT_GRADE_VALUES
} from "@/lib/student-grade-form";

export const CURRENT_TERMS_VERSION = "2026-06-12";

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

export { defaultGradeFromLevelParam, defaultSchoolLevelFromLevelParam };

const studentGradeSchema = z.enum(STUDENT_GRADE_VALUES);

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
    school_level: z.enum(["preparatory", "secondary"]).optional(),
    grade: studentGradeSchema.optional(),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || String(val).trim().length >= 8, "رقم الهاتف غير صالح")
  })
  .superRefine((data, ctx) => {
    if (data.role !== "student") return;

    if (!data.school_level) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر المرحلة الدراسية (إعدادي أو ثانوي)",
        path: ["school_level"]
      });
    }

    if (!data.grade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر الصف الدراسي",
        path: ["grade"]
      });
    }

    if (data.school_level && data.grade && !isGradeValidForSchoolLevel(data.grade, data.school_level)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "الصف لا يطابق المرحلة المختارة",
        path: ["grade"]
      });
    }
  });

export const onboardingSchema = registerStep2Schema.extend({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على الشروط وسياسة الخصوصية" })
  })
});
