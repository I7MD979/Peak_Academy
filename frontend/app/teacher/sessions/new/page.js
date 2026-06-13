"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import TeacherCreateSessionView from "@/components/teacher/TeacherCreateSessionPage";
import PageContainer from "@/components/shared/PageContainer";
import { VerificationStatusBanner } from "@/components/shared/VerificationStatusBanner";
import { accountApi, sessionsApi } from "@/lib/api";
import { getTeacherTeachingGate } from "@/lib/teacher-verification";
import { teacherBtnPrimary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";
import { SUBJECT_OPTIONS } from "@/lib/subjects";

const GRADE_BY_LEVEL = {
  preparatory: [
    { value: "prep_first", label: "الأول الإعدادي" },
    { value: "prep_second", label: "الثاني الإعدادي" },
    { value: "prep_third", label: "الثالث الإعدادي" }
  ],
  secondary: [
    { value: "sec_first", label: "الأول الثانوي" },
    { value: "sec_second", label: "الثاني الثانوي" },
    { value: "sec_third", label: "الثالث الثانوي" }
  ]
};

const SUBJECT_SELECT_OPTIONS = [
  ...SUBJECT_OPTIONS.map((item) => ({ value: item.key, label: item.label })),
  { value: "custom", label: "مادة أخرى…" }
];

const initialForm = {
  title: "",
  school_level: "secondary",
  grade: "sec_third",
  duration_min: 60,
  max_students: 10,
  scheduled_at: "",
  description: ""
};

function resolveSubjectValue(subjectMode, customSubject) {
  if (subjectMode === "custom") return customSubject.trim();
  return subjectMode.trim();
}

function validateSessionForm(values, subjectMode, customSubject) {
  const errors = {};
  const now = Date.now();
  const scheduledMs = new Date(values.scheduled_at).getTime();
  const subject = resolveSubjectValue(subjectMode, customSubject);

  const title = values.title.trim();
  if (!title) errors.title = "اكتب عنواناً واضحاً للجلسة";
  else if (title.length < 3) errors.title = "العنوان قصير جداً (3 أحرف على الأقل)";

  if (!subject) errors.subject = "اختر المادة أو اكتب اسمها";

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
    errors.scheduled_at = "اختر موعداً بعد 5 دقائق على الأقل من الآن";
  }

  const description = values.description.trim();
  if (description.length > 2000) {
    errors.description = "الوصف طويل جداً (2000 حرف كحد أقصى)";
  }

  return errors;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const teachingGate = getTeacherTeachingGate(verificationStatus);
  const [form, setForm] = useState(initialForm);
  const [subjectMode, setSubjectMode] = useState(SUBJECT_OPTIONS[0]?.key || "math");
  const [customSubject, setCustomSubject] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const minDate = useMemo(() => {
    const date = new Date();
    return date.toISOString().slice(0, 10);
  }, []);

  const gradeOptions = GRADE_BY_LEVEL[form.school_level] || GRADE_BY_LEVEL.secondary;

  useEffect(() => {
    accountApi
      .verificationStatus()
      .then((res) => setVerificationStatus(res?.data?.verification_status || "unverified"))
      .catch(() => setVerificationStatus("unverified"));
  }, []);

  const handleFieldChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      if (key === "school_level") {
        const nextGrades = GRADE_BY_LEVEL[value] || GRADE_BY_LEVEL.secondary;
        return {
          ...prev,
          school_level: value,
          grade: nextGrades[0]?.value || prev.grade
        };
      }
      if (key === "duration_min" || key === "max_students") {
        return { ...prev, [key]: value === "" ? "" : Number(value) };
      }
      return { ...prev, [key]: value };
    });
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubjectModeChange = (value) => {
    setSubjectMode(value);
    setFieldErrors((prev) => ({ ...prev, subject: "" }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!teachingGate.allowed) {
      toast.error(teachingGate.reason);
      return;
    }

    const errors = validateSessionForm(form, subjectMode, customSubject);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("يرجى مراجعة البيانات قبل الحفظ");
      return;
    }

    const subject = resolveSubjectValue(subjectMode, customSubject);

    try {
      setLoading(true);
      const res = await sessionsApi.create({
        title:        form.title.trim(),
        subject,
        max_students: Number(form.max_students),
        school_level: form.school_level,
        grade:        form.grade,
        duration_min: Number(form.duration_min),
        description:  form.description.trim() || null,
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
      setFieldErrors((prev) => ({ ...prev, _form: err.message || "تعذر إنشاء الجلسة" }));
    } finally {
      setLoading(false);
    }
  };

  if (!teachingGate.allowed) {
    return (
      <PageContainer>
        <VerificationStatusBanner role="teacher" verificationStatus={verificationStatus} />
        <div className={cn(teacherCardSolid, "mt-6 p-8 text-center")}>
          <p className="text-lg font-black text-auth-on-surface mb-2">التحقق مطلوب</p>
          <p className={cn("text-sm mb-4", teacherMuted)}>{teachingGate.reason}</p>
          <Link href="/teacher/profile/verification" className={teacherBtnPrimary}>
            إكمال التحقق
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <TeacherCreateSessionView
      form={form}
      fieldErrors={fieldErrors}
      loading={loading}
      gradeOptions={gradeOptions}
      subjectOptions={SUBJECT_SELECT_OPTIONS}
      subjectMode={subjectMode}
      customSubject={customSubject}
      minDate={minDate}
      onFieldChange={handleFieldChange}
      onSubjectModeChange={handleSubjectModeChange}
      onCustomSubjectChange={(e) => {
        setCustomSubject(e.target.value);
        setFieldErrors((prev) => ({ ...prev, subject: "" }));
      }}
      onSubmit={onSubmit}
      onCancel={() => router.push("/teacher/sessions")}
    />
  );
}
