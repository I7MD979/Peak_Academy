import { z } from "zod";

const egyptianPhone = z
  .string()
  .regex(/^(\+20|0020|0)?1[0125]\d{8}$/, "رقم هاتف مصري غير صالح");
const uuid = z.string().uuid("معرّف غير صالح");
const email = z.string().email("بريد إلكتروني غير صالح").max(254);
const arabicName = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[\u0600-\u06FF\s\-a-zA-Z]+$/, "الاسم يجب أن يحتوي على حروف فقط");

export const schemas = {
  register: z.object({
    email,
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(128),
    full_name: arabicName.optional()
  }),

  login: z.object({
    email,
    password: z.string().min(1).max(128)
  }),

  createSession: z.object({
    title: z.string().min(3).max(200),
    subject: z.string().min(1).max(100),
    school_level: z.enum(["preparatory", "secondary"]),
    price: z.number().min(0).max(10000),
    max_students: z.number().int().min(1).max(20),
    scheduled_at: z.string().datetime(),
    duration: z.number().int().min(30).max(180),
    description: z.string().max(5000).optional()
  }),

  initiatePayment: z.object({
    session_id: uuid,
    plan_id: uuid.optional()
  }),

  updateProfile: z.object({
    full_name: arabicName.optional(),
    phone: egyptianPhone.optional(),
    bio: z.string().max(500).optional()
  })
};

/** Validate middleware factory */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return res.status(400).json({
        success: false,
        error: "بيانات غير صالحة",
        details: errors,
        code: "VALIDATION_ERROR"
      });
    }
    req.body = result.data;
    next();
  };
}
