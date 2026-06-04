"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sessionsApi } from "@/lib/api";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";

const initialForm = {
  title: "",
  subject: "",
  grade: "third",
  duration_min: 60,
  price: "",
  max_students: 10,
  scheduled_at: "",
  description: ""
};

function validateSessionForm(values) {
  const errors = {};
  const now = Date.now();
  const scheduledMs = new Date(values.scheduled_at).getTime();

  if (!values.title.trim()) errors.title = "اكتب عنوانًا واضحًا للجلسة";
  if (!values.subject.trim()) errors.subject = "اختر أو اكتب اسم المادة";

  const price = Number(values.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "السعر يجب أن يكون رقمًا أكبر من صفر";
  }

  const maxStudents = Number(values.max_students);
  if (!Number.isInteger(maxStudents) || maxStudents < 2 || maxStudents > 100) {
    errors.max_students = "الحد الأقصى يجب أن يكون بين 2 و 100 طالب";
  }

  const duration = Number(values.duration_min);
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    errors.duration_min = "مدة الجلسة يجب أن تكون بين 15 و 240 دقيقة";
  }

  if (!values.scheduled_at) {
    errors.scheduled_at = "اختر موعد الجلسة";
  } else if (Number.isNaN(scheduledMs) || scheduledMs <= now + 5 * 60 * 1000) {
    errors.scheduled_at = "اختر موعدًا بعد 5 دقائق على الأقل";
  }

  return errors;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const minDateTime = useMemo(() => {
    const date = new Date(Date.now() + 5 * 60 * 1000);
    date.setSeconds(0, 0);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const errors = validateSessionForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("يرجى مراجعة البيانات قبل الحفظ");
      return;
    }

    try {
      setLoading(true);
      const res = await sessionsApi.create({
        title: form.title.trim(),
        subject: form.subject.trim(),
        price_per_student: Number(form.price),
        max_students: Number(form.max_students),
        grade: form.grade,
        duration_min: Number(form.duration_min),
        description: form.description.trim() || null,
        scheduled_at: new Date(form.scheduled_at).toISOString()
      });
      if (res?.data?.room_warning) {
        toast.warning(res.data.room_warning);
      } else {
        toast.success(res?.message || "تم إنشاء الجلسة بنجاح");
      }
      router.push("/teacher/sessions");
    } catch (err) {
      toast.error(err.message || "تعذر إنشاء الجلسة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-3xl bg-gradient-to-l from-primary to-[#0f1117] p-6 text-white shadow-lg">
        <p className="text-xs font-bold text-white/80">جلسة جديدة</p>
        <h2 className="mt-1 text-2xl font-black">أنشئ جلسة احترافية خلال دقيقة</h2>
        <p className="mt-2 text-sm text-white/75">
          أدخل بيانات الجلسة بدقة لضمان ظهورها بشكل واضح للطلاب وسهولة التسجيل.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <form className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label htmlFor="title">عنوان الجلسة</Label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="مثال: مراجعة نهائية كيمياء"
              maxLength={120}
            />
            {fieldErrors.title ? <p className="text-xs font-semibold text-destructive">{fieldErrors.title}</p> : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="subject">المادة</Label>
            <Input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleChange("subject")}
              placeholder="مثال: كيمياء"
              maxLength={60}
            />
            {fieldErrors.subject ? <p className="text-xs font-semibold text-destructive">{fieldErrors.subject}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <select
                id="grade"
                name="grade"
                value={form.grade}
                onChange={handleChange("grade")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="first">الأول الثانوي</option>
                <option value="second">الثاني الثانوي</option>
                <option value="third">الثالث الثانوي</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="duration_min">مدة الجلسة (دقيقة)</Label>
              <Input
                id="duration_min"
                name="duration_min"
                type="number"
                min="15"
                max="240"
                value={form.duration_min}
                onChange={handleChange("duration_min")}
              />
              {fieldErrors.duration_min ? (
                <p className="text-xs font-semibold text-destructive">{fieldErrors.duration_min}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="price">السعر (جنيه)</Label>
              <Input id="price" name="price" type="number" min="1" value={form.price} onChange={handleChange("price")} />
              {fieldErrors.price ? <p className="text-xs font-semibold text-destructive">{fieldErrors.price}</p> : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="max_students">الحد الأقصى للطلاب</Label>
              <Input
                id="max_students"
                name="max_students"
                type="number"
                min="2"
                max="100"
                value={form.max_students}
                onChange={handleChange("max_students")}
              />
              {fieldErrors.max_students ? (
                <p className="text-xs font-semibold text-destructive">{fieldErrors.max_students}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="scheduled_at">موعد الجلسة</Label>
            <Input
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              min={minDateTime}
              value={form.scheduled_at}
              onChange={handleChange("scheduled_at")}
            />
            {fieldErrors.scheduled_at ? (
              <p className="text-xs font-semibold text-destructive">{fieldErrors.scheduled_at}</p>
            ) : (
              <p className="text-xs text-text-muted">الحد الأدنى للموعد: بعد 5 دقائق من الآن</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">وصف مختصر (اختياري)</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange("description")}
              maxLength={600}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="اكتب نبذة عن محتوى الجلسة وما سيتعلمه الطلاب..."
            />
            <p className="text-xs text-text-muted">{form.description.length}/600</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-lg" disabled={loading} type="submit">
              {loading ? "جارٍ إنشاء الجلسة..." : "إنشاء الجلسة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/teacher/sessions")} disabled={loading}>
              إلغاء
            </Button>
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-black text-text">معاينة سريعة</h3>
          <p className="mt-1 text-sm text-text-muted">هكذا ستظهر بيانات الجلسة قبل النشر.</p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-bg p-3">
              <p className="text-xs text-text-muted">العنوان</p>
              <p className="font-bold text-text">{form.title.trim() || "—"}</p>
            </div>
            <div className="rounded-xl bg-bg p-3">
              <p className="text-xs text-text-muted">المادة / الصف</p>
              <p className="font-bold text-text">
                {(form.subject.trim() || "—") + " • " + (form.grade === "first" ? "الأول الثانوي" : form.grade === "second" ? "الثاني الثانوي" : "الثالث الثانوي")}
              </p>
            </div>
            <div className="rounded-xl bg-bg p-3">
              <p className="text-xs text-text-muted">الموعد</p>
              <p className="font-bold text-text">
                {form.scheduled_at ? formatDateTimeAr(new Date(form.scheduled_at).toISOString()) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-bg p-3">
              <p className="text-xs text-text-muted">السعر / السعة / المدة</p>
              <p className="font-bold text-text">
                {formatCurrencyEgp(form.price || 0)} • {Number(form.max_students || 0).toLocaleString("ar-EG")} طالب • {Number(form.duration_min || 0).toLocaleString("ar-EG")} دقيقة
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
