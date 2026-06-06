"use client";

import AppSidebar from "@/components/shared/AppSidebar";
import { TEACHER_NAV_MAIN, isTeacherNavActive } from "@/lib/teacher-nav";

export default function TeacherSidebar(props) {
  return (
    <AppSidebar
      logoHref="/teacher/dashboard"
      subtitle="لوحة المعلّم"
      navMain={TEACHER_NAV_MAIN}
      isNavActive={isTeacherNavActive}
      profileHref="/teacher/profile"
      roleLabel="معلّم"
      {...props}
    />
  );
}
